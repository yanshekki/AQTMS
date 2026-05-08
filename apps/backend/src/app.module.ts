import { Module } from '@nestjs/common';
import { RiskModule } from './risk/risk.module';
import { ExecutionModule } from './execution/execution.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ExchangeModule } from './exchange/exchange.module';

@Module({
  imports: [
    RiskModule,
    ExecutionModule,
    ReconciliationModule,
    ExchangeModule, // Phase 2.2 - provides BinancePositionProvider
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
