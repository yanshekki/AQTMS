import { Injectable, Logger } from '@nestjs/common';

interface PriceData {
  price: number;
  updatedAt: Date;
}

/**
 * MarketDataService
 *
 * Central service for latest market prices.
 * Designed to be fed by WebSocket clients (Binance, Bybit, etc.)
 * and consumed by PaperTradingService for real-time PnL calculation.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  // symbol -> { price, updatedAt }
  private priceCache = new Map<string, PriceData>();

  // Symbols we are interested in tracking
  private subscribedSymbols = new Set<string>();

  constructor() {
    this.logger.log('MarketDataService initialized (ready for WebSocket price feed)');
  }

  /**
   * Subscribe to price updates for specific symbols
   */
  subscribeToSymbols(symbols: string[]) {
    symbols.forEach((symbol) => {
      this.subscribedSymbols.add(symbol.toUpperCase());
    });
    this.logger.log(`Subscribed to price updates: ${symbols.join(', ')}`);
  }

  /**
   * Get latest price for a symbol
   */
  async getLatestPrice(symbol: string): Promise<number> {
    const cached = this.priceCache.get(symbol.toUpperCase());

    if (cached) {
      const ageMs = Date.now() - cached.updatedAt.getTime();
      // Consider price fresh if updated within last 10 seconds
      if (ageMs < 10_000) {
        return cached.price;
      }
    }

    return 0; // Not available or stale
  }

  /**
   * Update price from external source (WebSocket recommended)
   */
  updatePrice(symbol: string, price: number) {
    const normalizedSymbol = symbol.toUpperCase();

    this.priceCache.set(normalizedSymbol, {
      price,
      updatedAt: new Date(),
    });

    // Optional: log only for subscribed symbols
    if (this.subscribedSymbols.has(normalizedSymbol)) {
      this.logger.debug(`Price updated: ${normalizedSymbol} = ${price}`);
    }
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

  /**
   * Get all cached prices (useful for debugging)
   */
  getAllCachedPrices(): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [symbol, data] of this.priceCache.entries()) {
      result[symbol] = data.price;
    }

    return result;
  }

  /**
   * Check if we have fresh price for a symbol
   */
  hasFreshPrice(symbol: string, maxAgeMs = 10000): boolean {
    const cached = this.priceCache.get(symbol.toUpperCase());
    if (!cached) return false;

    return Date.now() - cached.updatedAt.getTime() < maxAgeMs;
  }
}
