import { Module } from '@nestjs/common';
import { HistoricalDataService } from './historical-data.service';

@Module({
  providers: [HistoricalDataService],
  exports: [HistoricalDataService],
})
export class DataModule {}
