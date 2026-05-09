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
import { OrderModule } from './order/order.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from './health/health.module';

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
    SafetyModule,
    OrderModule,
    WebsocketModule,
    HealthModule, // Health check endpoints
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
