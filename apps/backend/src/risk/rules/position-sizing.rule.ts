import { Logger } from '@nestjs/common';
import { RiskCheckContext, RiskCheckResult, RiskRule } from '../interfaces/risk-rule.interface';

/**
 * Position Sizing Rule（Phase 1 版本）
 *
 * 簡單實現：
 * - 預設每筆交易風險總資金的 1%
 * - 根據價格計算建議倉位大小
 * - 如果沒有 accountBalance，則跳過調整
 */
export class PositionSizingRule implements RiskRule {
  private readonly logger = new Logger(PositionSizingRule.name);
  name = 'PositionSizing';

  // Phase 1 先寫死 1%，之後可以從用戶設定讀取
  private readonly riskPerTradePercent = 0.01; // 1%

  async check(context: RiskCheckContext): Promise<RiskCheckResult> {
    try {
      const { accountBalance, price, quantity } = context;

      // 如果沒有帳戶餘額或價格，則不進行調整
      if (!accountBalance || !price || price <= 0) {
        return { passed: true };
      }

      const riskAmount = accountBalance * this.riskPerTradePercent;
      const suggestedQuantity = riskAmount / price;

      // 如果用戶輸入的數量明顯過大，則建議調整
      if (quantity > suggestedQuantity * 1.5) {
        return {
          passed: true, // 先通過，後續可改為 false 並強制調整
          reason: `建議倉位大小為 ${suggestedQuantity.toFixed(4)}`,
          adjustedQuantity: parseFloat(suggestedQuantity.toFixed(4)),
          riskAmount,
        };
      }

      return {
        passed: true,
        riskAmount,
      };
    } catch (error) {
      this.logger.error(
        `PositionSizingRule check failed`,
        error instanceof Error ? error.stack : error,
      );
      return { passed: true, reason: "Risk check error - using defaults" };
    }
  }
}
