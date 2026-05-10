import { Module } from '@nestjs/common';
import { PaperTradingService } from './paper-trading.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PaperTradingService],
  exports: [PaperTradingService],
})
export class PaperTradingModule {}