import { Injectable, Logger, Optional } from '@nestjs/common';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  // Simple in-memory cache (TTL based)
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 10_000; // 10 seconds cache for prices

  constructor(
    @Optional() private readonly ccxtAdapter?: CcxtExchangeAdapter,
  ) {}

  private getCacheKey(method: string, symbol: string, exchange: string, extra?: string): string {
    return `${exchange}:${symbol}:${method}${extra ? ':' + extra : ''}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttlMs = this.CACHE_TTL_MS) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 300; // exponential backoff
          this.logger.warn(`Retry attempt ${attempt} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * Get recent close prices for a symbol (used by StrategyRunner)
   */
  async getRecentPrices(symbol: string, limit: number = 30, exchange: string = 'binance'): Promise<number[]> {
    const cacheKey = this.getCacheKey('recentPrices', symbol, exchange, String(limit));
    const cached = this.getFromCache<number[]>(cacheKey);
    if (cached) return cached;

    try {
      if (!this.ccxtAdapter) {
        throw new Error('CcxtExchangeAdapter not available');
      }

      const prices = await this.withRetry(async () => {
        await this.ccxtAdapter.initialize({ exchange: exchange as any, testnet: false });
        const ohlcv = await this.ccxtAdapter.getOHLCV(symbol, '1m', limit);

        if (!ohlcv || ohlcv.length === 0) {
          throw new Error(`No OHLCV data returned for ${symbol}`);
        }

        return ohlcv.map((candle: any[]) => candle[4]);
      });

      this.setCache(cacheKey, prices);
      this.logger.debug(`Fetched ${prices.length} real prices for ${symbol}`);
      return prices;
    } catch (error) {
      this.logger.error(`Failed to get real recent prices for ${symbol}: ${error.message}`);
      throw new Error(`Unable to fetch real market data for ${symbol}. ${error.message}`);
    }
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string, exchange: string = 'binance'): Promise<number> {
    const cacheKey = this.getCacheKey('price', symbol, exchange);
    const cached = this.getFromCache<number>(cacheKey);
    if (cached) return cached;

    try {
      if (!this.ccxtAdapter) {
        throw new Error('CcxtExchangeAdapter not available');
      }

      const price = await this.withRetry(async () => {
        await this.ccxtAdapter.initialize({ exchange: exchange as any });
        const ticker = await this.ccxtAdapter.getTicker(symbol);
        return ticker?.last || ticker?.close || 0;
      });

      this.setCache(cacheKey, price);
      return price;
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
      if (!this.ccxtAdapter) {
        throw new Error('CcxtExchangeAdapter not available');
      }

      return await this.withRetry(async () => {
        await this.ccxtAdapter.initialize({ exchange: exchange as any });
        return await this.ccxtAdapter.getOHLCV(symbol, timeframe, limit);
      });
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
      if (!this.ccxtAdapter) {
        throw new Error('CcxtExchangeAdapter not available');
      }

      return await this.withRetry(async () => {
        await this.ccxtAdapter.initialize({ exchange: exchange as any });
        return await this.ccxtAdapter.getTicker(symbol);
      });
    } catch (error) {
      this.logger.error(`Failed to get real ticker: ${error.message}`);
      throw error;
    }
  }
}
