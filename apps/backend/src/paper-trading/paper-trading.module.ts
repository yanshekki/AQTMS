import { Module } from '@nestjs/common';
import { PaperTradingService } from './paper-trading.service';
import { PaperTradingController } from './paper-trading.controller';
import { MarketDataModule } from '../market-data/market-data.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, MarketDataModule],
  controllers: [PaperTradingController],
  providers: [PaperTradingService],
  exports: [PaperTradingService],
})
export class PaperTradingModule {}
