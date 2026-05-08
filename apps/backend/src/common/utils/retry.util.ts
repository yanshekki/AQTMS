export interface RetryOptions {
  retries?: number;           // 最大重試次數（預設 3）
  delay?: number;             // 初始延遲毫秒（預設 500ms）
  factor?: number;            // 指數退避倍數（預設 2）
  maxDelay?: number;          // 最大延遲時間（預設 10000ms）
  shouldRetry?: (error: any) => boolean; // 自訂是否需要重試
  onRetry?: (error: any, attempt: number) => void; // 重試時的回調
}

/**
 * 帶指數退避的重試工具
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    delay = 500,
    factor = 2,
    maxDelay = 10000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === retries || !shouldRetry(error)) {
        throw error;
      }

      // 計算延遲時間（指數退避 + 最大上限）
      const backoffDelay = Math.min(delay * Math.pow(factor, attempt), maxDelay);

      if (onRetry) {
        onRetry(error, attempt + 1);
      }

      console.warn(
        `[Retry] Attempt ${attempt + 1} failed. Retrying in ${backoffDelay}ms...`,
        error.message || error,
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError;
}
