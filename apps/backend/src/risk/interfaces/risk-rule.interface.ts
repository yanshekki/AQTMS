export interface RiskCheckContext {
  userId: string;
  exchange: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  accountBalance?: number; // 用戶帳戶餘額（用於倉位計算）
  // 之後可擴充 stopLoss, takeProfit 等
}

export interface RiskCheckResult {
  passed: boolean;
  reason?: string;
  adjustedQuantity?: number; // 如果系統建議調整倉位大小
  riskAmount?: number;       // 本次交易預計風險金額
}

export interface RiskRule {
  name: string;
  check(context: RiskCheckContext): Promise<RiskCheckResult>;
}
