import { Injectable, Logger, Optional } from '@nestjs/common';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    @Optional() private readonly ccxtAdapter?: CcxtExchangeAdapter,
  ) {}

  /**
   * Get recent close prices for a symbol (used by StrategyRunner)
   * This is the main method required for real strategy evaluation
   */
  async getRecentPrices(symbol: string, limit: number = 30, exchange: string = 'binance'): Promise<number[]> {
    try {
      if (this.ccxtAdapter) {
        await this.ccxtAdapter.initialize({ exchange: exchange as any, testnet: false });

        // Fetch OHLCV and extract close prices
        const ohlcv = await this.ccxtAdapter.getOHLCV(symbol, '1m', limit);

        if (ohlcv && ohlcv.length > 0) {
          // OHLCV format from ccxt: [timestamp, open, high, low, close, volume]
          const closePrices = ohlcv.map((candle: any[]) => candle[4]);
          this.logger.debug(`Fetched ${closePrices.length} real prices for ${symbol}`);
          return closePrices;
        }
      }

      // If ccxt fails or not available, throw to force proper configuration
      throw new Error(`Unable to fetch real market data for ${symbol}. Ensure ccxt is properly configured.`);
    } catch (error) {
      this.logger.error(`Failed to get real recent prices for ${symbol}: ${error.message}`);
      throw error; // Re-throw so StrategyRunner knows data is unavailable
    }
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string, exchange: string = 'binance'): Promise<number> {
    try {
      if (this.ccxtAdapter) {
        await this.ccxtAdapter.initialize({ exchange: exchange as any });
        const ticker = await this.ccxtAdapter.getTicker(symbol);
        return ticker?.last || ticker?.close || 0;
      }
      throw new Error(`No real price data available for ${symbol}`);
    } catch (error) {
      this.logger.error(`Failed to get real price for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get OHLCV candles (real via ccxt)
   */
  async getCandles(
    symbol: string,
    timeframe: string = '1h',
    limit: number = 100,
    exchange: string = 'binance',
  ): Promise<any[]> {
    try {
      if (this.ccxtAdapter) {
        await this.ccxtAdapter.initialize({ exchange: exchange as any });
        return await this.ccxtAdapter.getOHLCV(symbol, timeframe, limit);
      }
      throw new Error(`No real candle data available for ${symbol}`);
    } catch (error) {
      this.logger.error(`Failed to get real candles for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get ticker
   */
  async getTicker(symbol: string, exchange: string = 'binance') {
    try {
      if (this.ccxtAdapter) {
        await this.ccxtAdapter.initialize({ exchange: exchange as any });
        return await this.ccxtAdapter.getTicker(symbol);
      }
      throw new Error(`No real ticker data available for ${symbol}`);
    } catch (error) {
      this.logger.error(`Failed to get real ticker: ${error.message}`);
      throw error;
    }
  }
}
