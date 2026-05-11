import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  // Simple in-memory cache (TTL based)
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5_000; // 5 seconds for real-time feel

  // Active price streaming intervals per symbol
  private priceStreams = new Map<string, NodeJS.Timeout>();

  constructor(
    @Optional() private readonly ccxtAdapter?: CcxtExchangeAdapter,
    @Optional() @Inject(forwardRef(() => WebsocketGateway)) private readonly websocketGateway?: WebsocketGateway,
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
          const delay = Math.pow(2, attempt) * 300;
          this.logger.warn(`Retry attempt ${attempt} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * Start real-time price streaming for a symbol (pushes via WebSocket)
   */
  async startPriceStreaming(symbol: string, exchange: string = 'binance', intervalMs: number = 3000) {
    const streamKey = `${exchange}:${symbol}`;

    if (this.priceStreams.has(streamKey)) {
      this.logger.warn(`Price streaming already active for ${symbol}`);
      return;
    }

    this.logger.log(`Starting real-time price streaming for ${symbol} on ${exchange}`);

    const interval = setInterval(async () => {
      try {
        const price = await this.getPrice(symbol, exchange);
        if (price > 0 && this.websocketGateway) {
          this.websocketGateway.pushPriceUpdate(symbol, price, Date.now());
        }
      } catch (error) {
        this.logger.error(`Error in price stream for ${symbol}: ${error.message}`);
      }
    }, intervalMs);

    this.priceStreams.set(streamKey, interval);
  }

  /**
   * Stop real-time price streaming for a symbol
   */
  stopPriceStreaming(symbol: string, exchange: string = 'binance') {
    const streamKey = `${exchange}:${symbol}`;
    const interval = this.priceStreams.get(streamKey);

    if (interval) {
      clearInterval(interval);
      this.priceStreams.delete(streamKey);
      this.logger.log(`Stopped price streaming for ${symbol}`);
    }
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
   * Get current price for a symbol (with cache)
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

  onModuleDestroy() {
    // Clean up all active streams on shutdown
    for (const [key, interval] of this.priceStreams.entries()) {
      clearInterval(interval);
    }
    this.priceStreams.clear();
  }
}
