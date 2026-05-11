import { Injectable, Logger, Optional } from '@nestjs/common';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    @Optional() private readonly ccxtAdapter?: CcxtExchangeAdapter,
  ) {}

  /**
   * Get current price for a symbol (real via ccxt if available)
   */
  async getPrice(symbol: string, exchange: string = 'binance'): Promise<number> {
    if (this.ccxtAdapter) {
      try {
        await this.ccxtAdapter.initialize({ exchange: exchange as any });
        const ticker = await this.ccxtAdapter.getTicker(symbol);
        return ticker?.last || ticker?.close || 0;
      } catch (error) {
        this.logger.warn(`Failed to get real price for ${symbol}, using fallback`, error);
      }
    }

    // Fallback mock price
    const mockPrices: Record<string, number> = {
      'BTCUSDT': 65000,
      'ETHUSDT': 3200,
      'SOLUSDT': 145,
    };
    return mockPrices[symbol.toUpperCase()] || 100;
  }

  /**
   * Get OHLCV candles (real via ccxt if available)
   */
  async getCandles(
    symbol: string,
    timeframe: string = '1h',
    limit: number = 100,
    exchange: string = 'binance',
  ): Promise<any[]> {
    if (this.ccxtAdapter) {
      try {
        await this.ccxtAdapter.initialize({ exchange: exchange as any });
        return await this.ccxtAdapter.getOHLCV(symbol, timeframe, limit);
      } catch (error) {
        this.logger.warn(`Failed to get real candles for ${symbol}`, error);
      }
    }

    // Fallback mock candles
    return Array.from({ length: limit }, (_, i) => ({
      timestamp: Date.now() - (limit - i) * 3600000,
      open: 100 + Math.random() * 10,
      high: 105 + Math.random() * 10,
      low: 95 + Math.random() * 10,
      close: 100 + Math.random() * 10,
      volume: 1000 + Math.random() * 500,
    }));
  }

  /**
   * Get ticker with more details
   */
  async getTicker(symbol: string, exchange: string = 'binance') {
    if (this.ccxtAdapter) {
      try {
        await this.ccxtAdapter.initialize({ exchange: exchange as any });
        return await this.ccxtAdapter.getTicker(symbol);
      } catch (error) {
        this.logger.warn(`Failed to get real ticker`, error);
      }
    }
    return { symbol, last: await this.getPrice(symbol), timestamp: Date.now() };
  }
}
