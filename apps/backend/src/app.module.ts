import { Module } from '@nestjs/common';
import { RiskModule } from './risk/risk.module';
import { ExecutionModule } from './execution/execution.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';

@Module({
  imports: [
    RiskModule,
    ExecutionModule,
    ReconciliationModule, // Phase 2.2
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
