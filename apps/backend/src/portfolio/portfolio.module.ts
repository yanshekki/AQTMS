import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { PaperTradingModule } from '../paper-trading/paper-trading.module';
import { SafetyModule } from '../safety/safety.module';
import { NotificationModule } from '../notification/notification.module';
import { DailyPnLService } from './daily-pnl.service';

@Module({
  imports: [PaperTradingModule, SafetyModule, NotificationModule],
  controllers: [PortfolioController],
  providers: [PortfolioService, DailyPnLService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
