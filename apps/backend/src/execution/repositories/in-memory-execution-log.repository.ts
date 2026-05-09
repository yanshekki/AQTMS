import { Injectable } from '@nestjs/common';
import { IExecutionLogRepository } from '../interfaces/execution-log.repository';
import { ExecutionLog, LogQuery } from '../execution-logger.service';

@Injectable()
export class InMemoryExecutionLogRepository implements IExecutionLogRepository {
  private logs: ExecutionLog[] = [];

  save(log: ExecutionLog): void {
    this.logs.push(log);

    // 限制記憶體使用
    if (this.logs.length > 10000) {
      this.logs.shift();
    }
  }

  find(query: LogQuery = {}): ExecutionLog[] {
    let result = this.logs;

    if (query.userId) result = result.filter(l => l.userId === query.userId);
    if (query.orderId) result = result.filter(l => l.orderId === query.orderId);
    if (query.symbol) result = result.filter(l => l.symbol === query.symbol);
    if (query.action) result = result.filter(l => l.action === query.action);
    if (query.level) result = result.filter(l => l.level === query.level);
    if (query.startTime) result = result.filter(l => l.timestamp >= query.startTime!);
    if (query.endTime) result = result.filter(l => l.timestamp <= query.endTime!);

    result = result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (query.limit) {
      result = result.slice(0, query.limit);
    }

    return result;
  }

  clear(): void {
    this.logs = [];
  }

  count(): number {
    return this.logs.length;
  }
}
