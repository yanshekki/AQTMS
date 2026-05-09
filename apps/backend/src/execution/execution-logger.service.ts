import { Injectable, Inject, Optional } from '@nestjs/common';
import { IExecutionLogRepository } from './interfaces/execution-log.repository';
import { ExecutionLog, LogQuery } from './execution-logger.service';

@Injectable()
export class ExecutionLoggerService {
  constructor(
    @Optional() @Inject('EXECUTION_LOG_REPOSITORY')
    private readonly logRepository?: IExecutionLogRepository,
  ) {}

  private get repository(): IExecutionLogRepository {
    if (!this.logRepository) {
      throw new Error('ExecutionLogRepository not provided');
    }
    return this.logRepository;
  }

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

    this.repository.save(logEntry);

    // 同時輸出到 console（方便開發）
    console.log(JSON.stringify({
      ...logEntry,
      service: 'execution',
    }));
  }

  getLogs(query: LogQuery = {}): ExecutionLog[] {
    return this.repository.find(query) as ExecutionLog[];
  }

  getStats() {
    const logs = this.repository.find({}) as ExecutionLog[];
    const total = logs.length;
    const errors = logs.filter(l => l.level === 'error').length;
    const retries = logs.filter(l => l.action === 'RETRY').length;

    const latencies = logs
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
    this.repository.clear();
  }
}
