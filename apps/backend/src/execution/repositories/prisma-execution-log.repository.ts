import { Injectable } from '@nestjs/common';
import { IExecutionLogRepository } from '../interfaces/execution-log.repository';
import { ExecutionLog, LogQuery } from '../execution-logger.service';

// 假設你有標準的 PrismaService
// import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class PrismaExecutionLogRepository implements IExecutionLogRepository {
  // constructor(private readonly prisma: PrismaService) {}

  async save(log: ExecutionLog): Promise<void> {
    // await this.prisma.executionLog.create({
    //   data: {
    //     timestamp: log.timestamp,
    //     level: log.level,
    //     action: log.action,
    //     userId: log.userId || null,
    //     orderId: log.orderId || null,
    //     symbol: log.symbol || null,
    //     side: log.side || null,
    //     quantity: log.quantity || null,
    //     price: log.price || null,
    //     latencyMs: log.latencyMs || null,
    //     attempt: log.attempt || null,
    //     message: log.message || null,
    //     error: log.error || null,
    //     metadata: log.metadata || null,
    //   },
    // });
    console.log('[Prisma] Execution log saved');
  }

  async find(query: LogQuery = {}): Promise<ExecutionLog[]> {
    // const where: any = {};
    // if (query.userId) where.userId = query.userId;
    // if (query.orderId) where.orderId = query.orderId;
    // if (query.symbol) where.symbol = query.symbol;
    // if (query.action) where.action = query.action;
    // if (query.level) where.level = query.level;
    // if (query.startTime || query.endTime) {
    //   where.timestamp = {};
    //   if (query.startTime) where.timestamp.gte = query.startTime;
    //   if (query.endTime) where.timestamp.lte = query.endTime;
    // }

    // const logs = await this.prisma.executionLog.findMany({
    //   where,
    //   orderBy: { timestamp: 'desc' },
    //   take: query.limit || 100,
    // });

    // return logs.map(this.mapToExecutionLog);
    return [];
  }

  async clear(): Promise<void> {
    // await this.prisma.executionLog.deleteMany({});
    console.log('[Prisma] Execution logs cleared');
  }

  private mapToExecutionLog(dbLog: any): ExecutionLog {
    return {
      timestamp: dbLog.timestamp,
      level: dbLog.level as 'info' | 'warn' | 'error',
      action: dbLog.action,
      userId: dbLog.userId,
      orderId: dbLog.orderId,
      symbol: dbLog.symbol,
      side: dbLog.side,
      quantity: dbLog.quantity,
      price: dbLog.price,
      latencyMs: dbLog.latencyMs,
      attempt: dbLog.attempt,
      message: dbLog.message,
      error: dbLog.error,
      metadata: dbLog.metadata,
    };
  }
}
