import { IStrategy, Candle, Signal } from './strategy.interface';

export abstract class BaseStrategy implements IStrategy {
  abstract readonly name: string;

  protected params: Record<string, any> = {};

  initialize(params: Record<string, any> = {}): void {
    this.params = params;
    this.onInitialize();
  }

  /**
   * 子類別可覆寫此方法進行初始化
   */
  protected onInitialize(): void {
    // 子類別可選實作
  }

  abstract onCandle(candle: Candle): Signal | null;

  reset(): void {
    this.onReset();
  }

  /**
   * 子類別可覆寫此方法進行重置
   */
  protected onReset(): void {
    // 子類別可選實作
  }

  /**
   * 取得當前策略參數
   */
  getParams(): Record<string, any> {
    return { ...this.params };
  }
}
