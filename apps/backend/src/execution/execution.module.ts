import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { RiskModule } from '../risk/risk.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaperTradingModule } from '../paper-trading/paper-trading.module';

@Module({
  imports: [RiskModule, PrismaModule, PaperTradingModule],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}