export interface IStrategy {
  name: string;

  /**
   * Initialize strategy with parameters
   */
  initialize(params: Record<string, any>): void;

  /**
   * Called on each new candle/bar during backtest
   */
  onBar(data: {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }): {
    signal: 'BUY' | 'SELL' | 'HOLD';
    quantity?: number;
    metadata?: Record<string, any>;
  };

  /**
   * Optional: called when backtest ends
   */
  onEnd?(): void;
}
