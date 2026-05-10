import { Module } from '@nestjs/common';
import { PaperTradingService } from './paper-trading.service';
import { MarketDataModule } from '../market-data/market-data.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [MarketDataModule, RiskModule],
  providers: [PaperTradingService],
  exports: [PaperTradingService],
})
export class PaperTradingModule {}