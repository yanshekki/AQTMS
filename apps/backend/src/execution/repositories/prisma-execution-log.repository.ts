import { Injectable } from '@nestjs/common';
import { IExecutionLogRepository } from '../interfaces/execution-log.repository';
import { ExecutionLog, LogQuery } from '../execution-logger.service';

// 假設你的專案有全域的 PrismaService
// import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class PrismaExecutionLogRepository implements IExecutionLogRepository {
  constructor(
    // private readonly prisma: PrismaService   // ← 取消註解並確保 PrismaService 可注入
  ) {}

  async save(log: ExecutionLog): Promise<void> {
    // await this.prisma.executionLog.create({ data: { ... } });
    // TODO: replace console with logger once implemented
    // console.log('[Prisma] Execution log saved (implement when Prisma model is ready)');
  }

  async find(query: LogQuery = {}): Promise<ExecutionLog[]> {
    // TODO: implement Prisma findMany with filters
    return [];
  }

  async clear(): Promise<void> {
    // await this.prisma.executionLog.deleteMany({});
    // TODO: replace console with logger once implemented
    // console.log('[Prisma] Logs cleared');
  }
}
