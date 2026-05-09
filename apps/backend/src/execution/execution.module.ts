import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ExecutionLoggerService } from './execution-logger.service';
import { ExecutionController } from './execution.controller';
import { ExecutionMetricsCollector } from './metrics-collector.service';
import { InMemoryExecutionLogRepository } from './repositories/in-memory-execution-log.repository';
import { PrismaExecutionLogRepository } from './repositories/prisma-execution-log.repository';
import { IExecutionLogRepository } from './interfaces/execution-log.repository';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [RiskModule],
  controllers: [ExecutionController],
  providers: [
    ExecutionService,
    ExecutionLoggerService,
    ExecutionMetricsCollector,
    {
      provide: 'EXECUTION_LOG_REPOSITORY',
      useFactory: () => {
        const storageType = process.env.EXECUTION_LOG_STORAGE || 'memory';
        return storageType === 'prisma'
          ? new PrismaExecutionLogRepository()
          : new InMemoryExecutionLogRepository();
      },
    },
  ],
  exports: [ExecutionService, ExecutionLoggerService, ExecutionMetricsCollector],
})
export class ExecutionModule {}
