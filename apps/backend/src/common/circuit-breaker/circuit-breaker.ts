export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;   // 失敗閾值（預設 5 次）
  resetTimeout?: number;       // 開啟後多久進入 Half-Open（預設 30000ms）
  successThreshold?: number;   // Half-Open 狀態下成功多少次才關閉（預設 1）
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(private options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 1,
      ...options,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout!) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN. Request blocked.');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold!) {
        this.state = CircuitState.CLOSED;
        // [CircuitBreaker] State changed to CLOSED (debug log removed for prod)
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.options.failureThreshold!
    ) {
      this.state = CircuitState.OPEN;
      // [CircuitBreaker] State changed to OPEN (debug log removed for prod)
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      // [CircuitBreaker] State changed back to OPEN from HALF_OPEN (debug)
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    // [CircuitBreaker] Manually reset to CLOSED (debug log removed for prod)
  }
}
