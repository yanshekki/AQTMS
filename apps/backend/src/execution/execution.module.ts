import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ExecutionLoggerService } from './execution-logger.service';
import { ExecutionController } from './execution.controller';
import { InMemoryExecutionLogRepository } from './repositories/in-memory-execution-log.repository';
import { IExecutionLogRepository } from './interfaces/execution-log.repository';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [RiskModule],
  controllers: [ExecutionController],
  providers: [
    ExecutionService,
    ExecutionLoggerService,
    {
      provide: 'EXECUTION_LOG_REPOSITORY',
      useClass: InMemoryExecutionLogRepository,
    },
  ],
  exports: [ExecutionService, ExecutionLoggerService],
})
export class ExecutionModule {}
