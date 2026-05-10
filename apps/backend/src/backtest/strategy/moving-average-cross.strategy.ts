import { IStrategy } from './strategy.interface';

interface MAParams {
  shortPeriod: number;
  longPeriod: number;
}

/**
 * Simple Moving Average Crossover Strategy
 * Example strategy for Phase 5
 */
export class MovingAverageCrossStrategy implements IStrategy {
  name = 'ma-cross';

  private params!: MAParams;
  private priceHistory: number[] = [];

  initialize(params: Record<string, any>): void {
    this.params = {
      shortPeriod: params.shortPeriod ?? 10,
      longPeriod: params.longPeriod ?? 30,
    };
    this.priceHistory = [];
  }

  onBar(data: {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }) {
    this.priceHistory.push(data.close);

    // Keep only enough history
    const maxPeriod = Math.max(this.params.shortPeriod, this.params.longPeriod);
    if (this.priceHistory.length > maxPeriod) {
      this.priceHistory.shift();
    }

    if (this.priceHistory.length < maxPeriod) {
      return { signal: 'HOLD' as const };
    }

    const shortMA = this.calculateSMA(this.params.shortPeriod);
    const longMA = this.calculateSMA(this.params.longPeriod);

    // Simple crossover logic
    const prevShort = this.calculateSMA(this.params.shortPeriod, 1);
    const prevLong = this.calculateSMA(this.params.longPeriod, 1);

    if (prevShort <= prevLong && shortMA > longMA) {
      return {
        signal: 'BUY' as const,
        quantity: 1, // placeholder
        metadata: { shortMA, longMA },
      };
    }

    if (prevShort >= prevLong && shortMA < longMA) {
      return {
        signal: 'SELL' as const,
        quantity: 1,
        metadata: { shortMA, longMA },
      };
    }

    return { signal: 'HOLD' as const };
  }

  private calculateSMA(period: number, offset = 0): number {
    const start = this.priceHistory.length - period - offset;
    const end = this.priceHistory.length - offset;
    const slice = this.priceHistory.slice(start, end);

    if (slice.length === 0) return 0;

    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / slice.length;
  }
}
