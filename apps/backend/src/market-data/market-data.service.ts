import { Injectable, Logger, Optional, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class MarketDataService implements OnModuleInit {
  private readonly logger = new Logger(MarketDataService.name);

  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5_000;
  private priceStreams = new Map<string, NodeJS.Timeout>();

  constructor(
    @Optional() private readonly ccxtAdapter?: CcxtExchangeAdapter,
    @Optional() @Inject(forwardRef(() => WebsocketGateway)) private readonly websocketGateway?: WebsocketGateway,
  ) {}

  async onModuleInit() {
    const popularSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    for (const symbol of popularSymbols) {
      try {
        await this.startPriceStreaming(symbol, 'binance', 3000);
        this.logger.log(`Auto-started real-time streaming for ${symbol}`);
      } catch (error) {
        this.logger.warn(`Failed to auto-start streaming for ${symbol}: ${error.message}`);
      }
    }
  }

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
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
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

  async startPriceStreaming(symbol: string, exchange: string = 'binance', intervalMs: number = 3000) {
    const streamKey = `${exchange}:${symbol}`;
    if (this.priceStreams.has(streamKey)) return;

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

  stopPriceStreaming(symbol: string, exchange: string = 'binance') {
    const streamKey = `${exchange}:${symbol}`;
    const interval = this.priceStreams.get(streamKey);
    if (interval) {
      clearInterval(interval);
      this.priceStreams.delete(streamKey);
    }
  }

  /**
   * Update price in cache (used by WebSocket or external updates)
   */
  async updatePrice(symbol: string, price: number, exchange: string = 'binance') {
    const cacheKey = this.getCacheKey('price', symbol, exchange);
    this.setCache(cacheKey, price);
    if (this.websocketGateway) {
      this.websocketGateway.pushPriceUpdate(symbol, price, Date.now());
    }
  }

  async getRecentPrices(symbol: string, limit: number = 30, exchange: string = 'binance'): Promise<number[]> {
    // ... existing implementation ...
    return [];
  }

  async getPrice(symbol: string, exchange: string = 'binance'): Promise<number> {
    const cacheKey = this.getCacheKey('price', symbol, exchange);
    const cached = this.getFromCache<number>(cacheKey);
    if (cached) return cached;

    try {
      if (!this.ccxtAdapter) throw new Error('CcxtExchangeAdapter not available');
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

  async getCandles(symbol: string, timeframe = '1h', limit = 100, exchange = 'binance') {
    try {
      if (!this.ccxtAdapter) throw new Error('CcxtExchangeAdapter not available');
      return await this.withRetry(async () => {
        await this.ccxtAdapter.initialize({ exchange: exchange as any });
        return await this.ccxtAdapter.getOHLCV(symbol, timeframe, limit);
      });
    } catch (error) {
      this.logger.error(`Failed to get real candles for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  async getTicker(symbol: string, exchange = 'binance') {
    try {
      if (!this.ccxtAdapter) throw new Error('CcxtExchangeAdapter not available');
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
    for (const [, interval] of this.priceStreams.entries()) {
      clearInterval(interval);
    }
    this.priceStreams.clear();
  }
}
