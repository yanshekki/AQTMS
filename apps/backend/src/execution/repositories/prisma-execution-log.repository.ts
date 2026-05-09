import { Injectable } from '@nestjs/common';
import { IExecutionLogRepository } from '../interfaces/execution-log.repository';
import { ExecutionLog, LogQuery } from '../execution-logger.service';

// 假設專案有 PrismaService
// import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class PrismaExecutionLogRepository implements IExecutionLogRepository {
  // constructor(private readonly prisma: PrismaService) {}

  async save(log: ExecutionLog): Promise<void> {
    // TODO: 實作 Prisma create
    // await this.prisma.executionLog.create({
    //   data: {
    //     timestamp: log.timestamp,
    //     level: log.level,
    //     action: log.action,
    //     userId: log.userId,
    //     orderId: log.orderId,
    //     symbol: log.symbol,
    //     side: log.side,
    //     quantity: log.quantity,
    //     price: log.price,
    //     latencyMs: log.latencyMs,
    //     attempt: log.attempt,
    //     message: log.message,
    //     error: log.error,
    //     metadata: log.metadata as any,
    //   },
    // });
    console.log('[PrismaExecutionLogRepository] Log saved (TODO: implement Prisma create)');
  }

  async find(query: LogQuery = {}): Promise<ExecutionLog[]> {
    // TODO: 實作 Prisma findMany with filters
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
    // TODO: await this.prisma.executionLog.deleteMany({});
    console.log('[PrismaExecutionLogRepository] Logs cleared (TODO: implement)');
  }

  private mapToExecutionLog(dbLog: any): ExecutionLog {
    return {
      timestamp: dbLog.timestamp,
      level: dbLog.level as any,
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
