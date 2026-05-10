import { IStrategy } from './strategy.interface';

interface MeanReversionParams {
  period: number;
  deviationThreshold: number; // e.g. 2.0 means 2 standard deviations
}

/**
 * Simple Mean Reversion Strategy
 * Buys when price is significantly below MA, sells when significantly above.
 */
export class MeanReversionStrategy implements IStrategy {
  name = 'mean-reversion';

  private params!: MeanReversionParams;
  private priceHistory: number[] = [];

  initialize(params: Record<string, any>): void {
    this.params = {
      period: params.period ?? 20,
      deviationThreshold: params.deviationThreshold ?? 2.0,
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

    const period = this.params.period;
    if (this.priceHistory.length < period) {
      return { signal: 'HOLD' as const };
    }

    // Keep history size reasonable
    if (this.priceHistory.length > period * 2) {
      this.priceHistory.shift();
    }

    const ma = this.calculateSMA(period);
    const stdDev = this.calculateStdDev(period);

    const upperBand = ma + stdDev * this.params.deviationThreshold;
    const lowerBand = ma - stdDev * this.params.deviationThreshold;

    if (data.close < lowerBand) {
      return {
        signal: 'BUY' as const,
        quantity: 1,
        metadata: { ma, lowerBand, price: data.close },
      };
    }

    if (data.close > upperBand) {
      return {
        signal: 'SELL' as const,
        quantity: 1,
        metadata: { ma, upperBand, price: data.close },
      };
    }

    return { signal: 'HOLD' as const };
  }

  private calculateSMA(period: number): number {
    const slice = this.priceHistory.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private calculateStdDev(period: number): number {
    const slice = this.priceHistory.slice(-period);
    const mean = this.calculateSMA(period);
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / slice.length;
    return Math.sqrt(variance);
  }
}
