import { Module } from '@nestjs/common';
import { RiskModule } from './risk/risk.module';
import { ExecutionModule } from './execution/execution.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ExchangeModule } from './exchange/exchange.module';
import { PaperTradingModule } from './paper-trading/paper-trading.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { NotificationModule } from './notification/notification.module';
import { DataModule } from './data/data.module';
import { BacktestModule } from './backtest/backtest.module';
import { SafetyModule } from './safety/safety.module';

@Module({
  imports: [
    RiskModule,
    ExecutionModule,
    ReconciliationModule,
    ExchangeModule,
    PaperTradingModule,
    PortfolioModule,
    NotificationModule,
    DataModule,
    BacktestModule,
    SafetyModule, // Phase 5 - Kill Switch & Safety
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
