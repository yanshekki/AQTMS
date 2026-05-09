import { IStrategy, Candle, Signal } from '../interfaces/strategy.interface';

export class MovingAverageCrossoverStrategy implements IStrategy {
  readonly name = 'MA_Crossover';

  private shortPeriod: number;
  private longPeriod: number;

  private shortMA: number[] = [];
  private longMA: number[] = [];
  private prices: number[] = [];

  initialize(params: { shortPeriod?: number; longPeriod?: number } = {}): void {
    this.shortPeriod = params.shortPeriod ?? 10;
    this.longPeriod = params.longPeriod ?? 30;
    this.shortMA = [];
    this.longMA = [];
    this.prices = [];
  }

  onCandle(candle: Candle): Signal | null {
    this.prices.push(candle.close);

    // 計算短期 MA
    if (this.prices.length >= this.shortPeriod) {
      const shortSum = this.prices.slice(-this.shortPeriod).reduce((a, b) => a + b, 0);
      this.shortMA.push(shortSum / this.shortPeriod);
    }

    // 計算長期 MA
    if (this.prices.length >= this.longPeriod) {
      const longSum = this.prices.slice(-this.longPeriod).reduce((a, b) => a + b, 0);
      this.longMA.push(longSum / this.longPeriod);
    }

    // 需要足夠數據才產生訊號
    if (this.shortMA.length < 2 || this.longMA.length < 2) {
      return null;
    }

    const prevShort = this.shortMA[this.shortMA.length - 2];
    const currShort = this.shortMA[this.shortMA.length - 1];
    const prevLong = this.longMA[this.longMA.length - 2];
    const currLong = this.longMA[this.longMA.length - 1];

    // 黃金交叉（短期上穿長期）→ 買入
    if (prevShort <= prevLong && currShort > currLong) {
      return {
        action: 'BUY',
        price: candle.close,
        reason: 'MA Golden Cross',
      };
    }

    // 死亡交叉（短期下穿長期）→ 賣出
    if (prevShort >= prevLong && currShort < currLong) {
      return {
        action: 'SELL',
        price: candle.close,
        reason: 'MA Death Cross',
      };
    }

    return { action: 'HOLD' };
  }

  reset(): void {
    this.shortMA = [];
    this.longMA = [];
    this.prices = [];
  }
}
