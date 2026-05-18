import { RiskCheckContext, RiskCheckResult, RiskRule } from '../interfaces/risk-rule.interface';

/**
 * Max Daily Loss Rule（Phase 1 版本）
 *
 * 簡單實現：
 * - 預設每日最大虧損為帳戶總資金的 3%
 * - 如果今日已虧損超過上限，則禁止交易
 */
export class MaxDailyLossRule implements RiskRule {
  name = 'MaxDailyLoss';

  // Phase 1 先寫死 3%，之後可以從用戶設定讀取
  private readonly maxDailyLossPercent = 0.03; // 3%

  async check(context: RiskCheckContext): Promise<RiskCheckResult> {
    const { accountBalance, currentDailyLoss } = context as any; // 暫時用 any，之後會擴充 Context

    if (!accountBalance || currentDailyLoss === undefined) {
      return { passed: true }; // 資料不足時先通過
    }

    const maxAllowedLoss = accountBalance * this.maxDailyLossPercent;

    // Safety: use abs() to handle negative loss values consistently
    if (Math.abs(currentDailyLoss) > maxAllowedLoss) {
      return {
        passed: false,
        reason: `今日虧損已達上限（${maxAllowedLoss.toFixed(2)}），暫停交易`,
      };
    }

    return { passed: true };
  }
}
