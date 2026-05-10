import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { PaperTradingModule } from '../paper-trading/paper-trading.module';
import { RiskModule } from '../risk/risk.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';

@Module({
  imports: [PaperTradingModule, RiskModule, MarketDataModule],
  providers: [
    ExecutionService,
    {
      provide: 'IExchangeAdapter',
      useClass: CcxtExchangeAdapter,
    },
  ],
  exports: [ExecutionService],
})
export class ExecutionModule {}