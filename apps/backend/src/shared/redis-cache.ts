// ── Redis Cache Service ──
// Caches frequently-accessed data: market quotes, risk metrics, backtest results.

import redis from './redis';
import { logger } from './logger';

const CACHE_TTL = {
  QUOTE: 10,      // 10s for market data
  RISK: 30,       // 30s for risk metrics
  BACKTEST: 300,  // 5min for backtest results
  PORTFOLIO: 60,  // 1min for portfolio snapshots
  NEWS_FEED: 15,  // 15s for news feed
};

export class RedisCache {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch (error) {
      logger.warn({ error, key }, 'Redis cache get failed');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      logger.warn({ error, key }, 'Redis cache set failed');
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.warn({ error, pattern }, 'Redis cache invalidate failed');
    }
  }

  // ── Domain-specific caches ──

  async cacheQuote(symbol: string, data: unknown): Promise<void> {
    await this.set(`quote:${symbol}`, data, CACHE_TTL.QUOTE);
  }

  async getQuote(symbol: string): Promise<unknown | null> {
    return this.get(`quote:${symbol}`);
  }

  async cacheRiskMetrics(portfolioId: string, data: unknown): Promise<void> {
    await this.set(`risk:${portfolioId}`, data, CACHE_TTL.RISK);
  }

  async getRiskMetrics(portfolioId: string): Promise<unknown | null> {
    return this.get(`risk:${portfolioId}`);
  }

  async cacheBacktestResult(symbol: string, strategy: string, data: unknown): Promise<void> {
    const key = `backtest:${symbol}:${strategy}`;
    await this.set(key, data, CACHE_TTL.BACKTEST);
  }

  async getBacktestResult(symbol: string, strategy: string): Promise<unknown | null> {
    return this.get(`backtest:${symbol}:${strategy}`);
  }

  async cacheNewsFeed(limit: number, data: unknown): Promise<void> {
    await this.set(`news:feed:${limit}`, data, CACHE_TTL.NEWS_FEED);
  }

  async getNewsFeed(limit: number): Promise<unknown | null> {
    return this.get(`news:feed:${limit}`);
  }

  async invalidateNewsFeed(): Promise<void> {
    await this.invalidate('news:feed:*');
  }
}

export const redisCache = new RedisCache();
