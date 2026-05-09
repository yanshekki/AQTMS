import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ExecutionLoggerService } from './execution-logger.service';
import { ExecutionController } from './execution.controller';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [RiskModule],
  controllers: [ExecutionController],
  providers: [ExecutionService, ExecutionLoggerService],
  exports: [ExecutionService, ExecutionLoggerService],
})
export class ExecutionModule {}
