import { BaseStrategy } from '../interfaces/base.strategy';
import { Candle, Signal } from '../interfaces/strategy.interface';

export class MovingAverageCrossoverStrategy extends BaseStrategy {
  readonly name = 'MA_Crossover';

  private shortPeriod!: number;
  private longPeriod!: number;
  private prices: number[] = [];
  private shortMA: number[] = [];
  private longMA: number[] = [];

  protected onInitialize(): void {
    this.shortPeriod = this.params.shortPeriod ?? 10;
    this.longPeriod = this.params.longPeriod ?? 30;
    this.reset();
  }

  onCandle(candle: Candle): Signal | null {
    this.prices.push(candle.close);

    if (this.prices.length >= this.shortPeriod) {
      const shortSum = this.prices.slice(-this.shortPeriod).reduce((a, b) => a + b, 0);
      this.shortMA.push(shortSum / this.shortPeriod);
    }

    if (this.prices.length >= this.longPeriod) {
      const longSum = this.prices.slice(-this.longPeriod).reduce((a, b) => a + b, 0);
      this.longMA.push(longSum / this.longPeriod);
    }

    if (this.shortMA.length < 2 || this.longMA.length < 2) {
      return null;
    }

    const prevShort = this.shortMA[this.shortMA.length - 2];
    const currShort = this.shortMA[this.shortMA.length - 1];
    const prevLong = this.longMA[this.longMA.length - 2];
    const currLong = this.longMA[this.longMA.length - 1];

    if (prevShort <= prevLong && currShort > currLong) {
      return { action: 'BUY', price: candle.close, reason: 'MA Golden Cross' };
    }

    if (prevShort >= prevLong && currShort < currLong) {
      return { action: 'SELL', price: candle.close, reason: 'MA Death Cross' };
    }

    return { action: 'HOLD' };
  }

  protected onReset(): void {
    this.prices = [];
    this.shortMA = [];
    this.longMA = [];
  }
}
