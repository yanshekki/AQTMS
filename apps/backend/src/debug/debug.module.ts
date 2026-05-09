import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';
import { PaperTradingModule } from '../paper-trading/paper-trading.module';

@Module({
  imports: [PaperTradingModule],
  controllers: [DebugController],
})
export class DebugModule {}
