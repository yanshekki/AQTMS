import { Injectable } from '@nestjs/common';
import { IExecutionLogRepository } from '../interfaces/execution-log.repository';
import { ExecutionLog, LogQuery } from '../execution-logger.service';

@Injectable()
export class InMemoryExecutionLogRepository implements IExecutionLogRepository {
  private logs: ExecutionLog[] = [];

  async save(log: ExecutionLog): Promise<void> {
    this.logs.push(log);

    // 限制記憶體使用
    if (this.logs.length > 10000) {
      this.logs.shift();
    }
  }

  async find(query: LogQuery = {}): Promise<ExecutionLog[]> {
    let result = [...this.logs];

    if (query.action) {
      result = result.filter(l => l.action === query.action);
    }

    if (query.level) {
      result = result.filter(l => l.level === query.level);
    }

    if (query.from) {
      result = result.filter(l => l.timestamp && l.timestamp >= query.from!);
    }

    if (query.to) {
      result = result.filter(l => l.timestamp && l.timestamp <= query.to!);
    }

    // 按時間倒序排序
    result.sort((a, b) => {
      const timeA = a.timestamp?.getTime() ?? 0;
      const timeB = b.timestamp?.getTime() ?? 0;
      return timeB - timeA;
    });

    return result;
  }

  async clear(): Promise<void> {
    this.logs = [];
  }

  async count(): Promise<number> {
    return this.logs.length;
  }
}
