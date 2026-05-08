import { Module } from '@nestjs/common';
import { RiskModule } from './risk/risk.module';
import { ExecutionModule } from './execution/execution.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ExchangeModule } from './exchange/exchange.module';
import { PaperTradingModule } from './paper-trading/paper-trading.module';
import { PortfolioModule } from './portfolio/portfolio.module';

@Module({
  imports: [
    RiskModule,
    ExecutionModule,
    ReconciliationModule,
    ExchangeModule,
    PaperTradingModule,
    PortfolioModule, // Phase 3
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
