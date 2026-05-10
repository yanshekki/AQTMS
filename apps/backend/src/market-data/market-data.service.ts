import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  async getPrice(symbol: string): Promise<number> {
    this.logger.log(`Fetching price for ${symbol} (demo)`);
    return 50000;
  }
}