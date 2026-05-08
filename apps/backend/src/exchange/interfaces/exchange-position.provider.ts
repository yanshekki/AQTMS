export interface ExchangePosition {
  symbol: string;
  quantity: number;
  side: 'BUY' | 'SELL' | 'BOTH';
  entryPrice?: number;
  unrealizedPnl?: number;
}

export interface ExchangePositionProvider {
  /**
   * 獲取指定用戶在該交易所的當前持倉
   */
  getPositions(userId: string): Promise<ExchangePosition[]>;

  /**
   * 交易所名稱
   */
  getExchangeName(): string;
}
