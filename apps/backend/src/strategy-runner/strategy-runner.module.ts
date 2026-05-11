import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StrategyRunnerService } from './strategy-runner.service';
import { ExecutionModule } from '../execution/execution.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    forwardRef(() => ExecutionModule),
    RiskModule,
  ],
  providers: [StrategyRunnerService],
  exports: [StrategyRunnerService],
})
export class StrategyRunnerModule {}
