import { Injectable } from '@nestjs/common';

export interface ExecutionLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  action: string;
  userId?: string;
  orderId?: string;
  symbol?: string;
  side?: string;
  quantity?: number;
  price?: number;
  latencyMs?: number;
  attempt?: number;
  message?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface LogQuery {
  userId?: string;
  orderId?: string;
  symbol?: string;
  action?: string;
  level?: 'info' | 'warn' | 'error';
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

@Injectable()
export class ExecutionLoggerService {
  private logs: ExecutionLog[] = [];

  logPlacement(params: {
    userId: string;
    orderId: string;
    symbol: string;
    side: string;
    quantity: number;
    price?: number;
    latencyMs?: number;
  }) {
    this.logEvent({
      level: 'info',
      action: 'ORDER_PLACEMENT',
      ...params,
    });
  }

  logStatusUpdate(params: {
    orderId: string;
    fromStatus: string;
    toStatus: string;
    filledQuantity?: number;
  }) {
    this.logEvent({
      level: 'info',
      action: 'STATUS_UPDATE',
      ...params,
    });
  }

  logRetry(params: {
    orderId?: string;
    attempt: number;
    error: string;
  }) {
    this.logEvent({
      level: 'warn',
      action: 'RETRY',
      ...params,
    });
  }

  logError(params: {
    action: string;
    userId?: string;
    orderId?: string;
    error: string;
    metadata?: Record<string, any>;
  }) {
    this.logEvent({
      level: 'error',
      ...params,
    });
  }

  private logEvent(entry: Omit<ExecutionLog, 'timestamp'>) {
    const logEntry: ExecutionLog = {
      ...entry,
      timestamp: new Date(),
    };

    this.logs.push(logEntry);

    // 結構化輸出
    console.log(JSON.stringify({
      ...logEntry,
      service: 'execution',
    }));

    // 限制記憶體日誌數量（MVP）
    if (this.logs.length > 10000) {
      this.logs.shift();
    }
  }

  /**
   * 查詢日誌（支援多條件過濾）
   */
  getLogs(query: LogQuery = {}): ExecutionLog[] {
    let result = this.logs;

    if (query.userId) {
      result = result.filter(log => log.userId === query.userId);
    }
    if (query.orderId) {
      result = result.filter(log => log.orderId === query.orderId);
    }
    if (query.symbol) {
      result = result.filter(log => log.symbol === query.symbol);
    }
    if (query.action) {
      result = result.filter(log => log.action === query.action);
    }
    if (query.level) {
      result = result.filter(log => log.level === query.level);
    }
    if (query.startTime) {
      result = result.filter(log => log.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      result = result.filter(log => log.timestamp <= query.endTime!);
    }

    // 排序（由新到舊）
    result = result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (query.limit) {
      result = result.slice(0, query.limit);
    }

    return result;
  }

  /**
   * 取得簡單統計數據
   */
  getStats() {
    const total = this.logs.length;
    const errors = this.logs.filter(l => l.level === 'error').length;
    const retries = this.logs.filter(l => l.action === 'RETRY').length;

    const latencies = this.logs
      .filter(l => l.latencyMs !== undefined)
      .map(l => l.latencyMs!);

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    return {
      totalLogs: total,
      errorCount: errors,
      retryCount: retries,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      averageLatencyMs: Math.round(avgLatency),
    };
  }

  clearLogs() {
    this.logs = [];
  }
}
