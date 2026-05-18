import { RiskCheckContext, RiskCheckResult, RiskRule } from '../interfaces/risk-rule.interface';

/**
 * Max Open Positions Rule（Phase 1 版本）
 *
 * 簡單實現：
 * - 預設最多同時持倉 5 個倉位
 * - 如果已開倉位數量達到上限，則禁止開新倉
 */
export class MaxOpenPositionsRule implements RiskRule {
  name = 'MaxOpenPositions';

  // Phase 1 先寫死上限，之後可以從用戶設定讀取
  private readonly maxOpenPositions = 5;

  async check(context: RiskCheckContext): Promise<RiskCheckResult> {
    try {
      const currentOpenPositions = (context as any).currentOpenPositions;

      if (currentOpenPositions === undefined) {
        return { passed: true }; // 資料不足時先通過
      }

      if (currentOpenPositions >= this.maxOpenPositions) {
        return {
          passed: false,
          reason: `已達到最大持倉數量上限（${this.maxOpenPositions}），請先平倉`,
        };
      }

      return { passed: true };
    } catch (error) {
      this.logger.error(
        `MaxOpenPositionsRule check failed`,
        error instanceof Error ? error.stack : error,
      );
      return { passed: true, reason: "Risk check error - proceeding safely" };
    }
  }
}
