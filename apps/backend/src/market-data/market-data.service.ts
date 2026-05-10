import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export interface MarketPrice {
  symbol: string;
  price: number;
  timestamp: Date;
  volume?: number;
}

@Injectable()
export class MarketDataService implements OnModuleInit {
  private readonly logger = new Logger(MarketDataService.name);
  private prices: Map<string, MarketPrice> = new Map();
  private subscribers: Map<string, ((price: MarketPrice) => void)[]> = new Map();

  async onModuleInit() {
    this.logger.log('MarketDataService initialized (mock mode)');
    // TODO: Connect to Binance/Bybit WebSocket for real-time data
    // Example: use ccxt or native ws for live prices
    this.startMockPriceUpdates();
  }

  private startMockPriceUpdates() {
    // Simulate price updates for demo
    setInterval(() => {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
      symbols.forEach((symbol) => {
        const current = this.prices.get(symbol) || { symbol, price: 50000, timestamp: new Date() };
        const newPrice = current.price * (1 + (Math.random() - 0.5) * 0.002); // ±0.1% random walk
        const updated: MarketPrice = {
          symbol,
          price: parseFloat(newPrice.toFixed(2)),
          timestamp: new Date(),
          volume: Math.random() * 1000,
        };
        this.prices.set(symbol, updated);
        this.notifySubscribers(symbol, updated);
      });
    }, 5000); // every 5s
  }

  async getPrice(symbol: string): Promise<MarketPrice | null> {
    // TODO: fetch from exchange API if not in cache or stale
    return this.prices.get(symbol) || null;
  }

  async getPrices(symbols: string[]): Promise<MarketPrice[]> {
    return symbols
      .map((s) => this.prices.get(s))
      .filter((p): p is MarketPrice => !!p);
  }

  subscribe(symbol: string, callback: (price: MarketPrice) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, []);
    }
    this.subscribers.get(symbol)!.push(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(symbol);
      if (subs) {
        const idx = subs.indexOf(callback);
        if (idx > -1) subs.splice(idx, 1);
      }
    };
  }

  private notifySubscribers(symbol: string, price: MarketPrice) {
    const subs = this.subscribers.get(symbol) || [];
    subs.forEach((cb) => {
      try {
        cb(price);
      } catch (e) {
        this.logger.error(`Subscriber error for ${symbol}`, e);
      }
    });
  }

  // TODO: Implement real WebSocket connection (Binance, Bybit)
  // TODO: Add historical candles fetch via REST
  // TODO: Integrate with backtest_engine for historical data
}