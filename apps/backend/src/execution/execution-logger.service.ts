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

@Injectable()
export class ExecutionLoggerService {
  private logs: ExecutionLog[] = []; // MVP 使用記憶體儲存

  logPlacement(params: {
    userId: string;
    orderId: string;
    symbol: string;
    side: string;
    quantity: number;
    price?: number;
    latencyMs?: number;
  }) {
    this.log({
      level: 'info',
      action: 'ORDER_PLACEMENT',
      ...params,
      timestamp: new Date(),
    });
  }

  logStatusUpdate(params: {
    orderId: string;
    fromStatus: string;
    toStatus: string;
    filledQuantity?: number;
    averageFillPrice?: number;
  }) {
    this.log({
      level: 'info',
      action: 'STATUS_UPDATE',
      ...params,
      timestamp: new Date(),
    });
  }

  logRetry(params: {
    orderId?: string;
    attempt: number;
    error: string;
    latencyMs?: number;
  }) {
    this.log({
      level: 'warn',
      action: 'RETRY',
      ...params,
      timestamp: new Date(),
    });
  }

  logError(params: {
    action: string;
    userId?: string;
    orderId?: string;
    error: string;
    metadata?: Record<string, any>;
  }) {
    this.log({
      level: 'error',
      ...params,
      timestamp: new Date(),
    });
  }

  private log(entry: ExecutionLog) {
    this.logs.push(entry);

    // 結構化輸出（方便後續接 ELK / Loki 等）
    console.log(JSON.stringify({
      ...entry,
      service: 'execution',
    }));
  }

  getLogs(filter?: Partial<ExecutionLog>): ExecutionLog[] {
    if (!filter) return this.logs;

    return this.logs.filter(log =>
      Object.entries(filter).every(([key, value]) => (log as any)[key] === value)
    );
  }

  clearLogs() {
    this.logs = [];
  }
}
