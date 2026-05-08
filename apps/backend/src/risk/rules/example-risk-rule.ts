import { RiskCheckContext, RiskCheckResult, RiskRule } from '../interfaces/risk-rule.interface';

/**
 * 範例風險規則（Phase 1 參考用）
 * 之後可以刪除或改寫
 */
export class MaxPositionSizeRule implements RiskRule {
  name = 'MaxPositionSize';

  async check(context: RiskCheckContext): Promise<RiskCheckResult> {
    // TODO: 這裡應該從用戶設定或倉位服務取得最大倉位限制
    const maxAllowedQuantity = 1000; // 暫時寫死，之後改為動態

    if (context.quantity > maxAllowedQuantity) {
      return {
        passed: false,
        reason: `倉位過大，最大允許數量為 ${maxAllowedQuantity}`,
        adjustedQuantity: maxAllowedQuantity,
      };
    }

    return { passed: true };
  }
}
