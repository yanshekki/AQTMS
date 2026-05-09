export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  action: 'BUY' | 'SELL' | 'HOLD';
  price?: number;
  quantity?: number;
  reason?: string;
}

export interface IStrategy {
  /**
   * 策略名稱
   */
  readonly name: string;

  /**
   * 初始化策略（可傳入參數）
   */
  initialize(params?: Record<string, any>): void;

  /**
   * 每根 K 線觸發一次
   */
  onCandle(candle: Candle): Signal | null;

  /**
   * 重置策略狀態（用於新回測）
   */
  reset(): void;
}
