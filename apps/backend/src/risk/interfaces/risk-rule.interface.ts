export interface RiskCheckContext {
  userId: string;
  exchange: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  // 可以之後擴充更多欄位，例如 stopLoss, takeProfit 等
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
