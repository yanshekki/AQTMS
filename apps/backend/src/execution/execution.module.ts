import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [RiskModule],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
