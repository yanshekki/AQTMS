import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { RiskModule } from '../risk/risk.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [RiskModule, PrismaModule],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}