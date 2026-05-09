import { Injectable, Logger } from '@nestjs/common';

/**
 * MarketDataService
 *
 * Provides latest market prices for various symbols.
 * Can be backed by WebSocket (Binance/Bybit) or REST fallback.
 *
 * Used by PaperTradingService to calculate real-time Unrealized PnL.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  // Simple in-memory price cache
  // In production, this should be populated by WebSocket clients
  private priceCache = new Map<string, { price: number; updatedAt: Date }>();

  constructor() {
    this.logger.log('MarketDataService initialized');
  }

  /**
   * Get latest price for a symbol (e.g. BTCUSDT)
   * Returns 0 if price is not available yet.
   */
  async getLatestPrice(symbol: string): Promise<number> {
    const cached = this.priceCache.get(symbol.toUpperCase());

    if (cached) {
      // Price is fresh if updated within last 30 seconds
      const age = Date.now() - cached.updatedAt.getTime();
      if (age < 30_000) {
        return cached.price;
      }
    }

    // TODO: Integrate with BinanceWebsocketClient or REST fallback here
    // For now, return 0 if not in cache
    this.logger.debug(`Price not available for ${symbol} (cache miss)`);
    return 0;
  }

  /**
   * Update price in cache (called by WebSocket clients)
   */
  updatePrice(symbol: string, price: number) {
    this.priceCache.set(symbol.toUpperCase(), {
      price,
      updatedAt: new Date(),
    });
  }

  /**
   * Batch get prices
   */
  async getPrices(symbols: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    for (const symbol of symbols) {
      result[symbol] = await this.getLatestPrice(symbol);
    }

    return result;
  }
}
