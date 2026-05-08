import { Injectable } from '@nestjs/common';
import { RiskCheckContext, RiskCheckResult, RiskRule } from './interfaces/risk-rule.interface';

@Injectable()
export class RiskService {
  private rules: RiskRule[] = [];

  /**
   * 註冊風險規則
   * 之後可以在 RiskModule 裡面動態加入規則
   */
  registerRule(rule: RiskRule) {
    this.rules.push(rule);
  }

  /**
   * 執行所有風險檢查
   */
  async check(context: RiskCheckContext): Promise<RiskCheckResult> {
    for (const rule of this.rules) {
      const result = await rule.check(context);

      if (!result.passed) {
        return {
          passed: false,
          reason: `[${rule.name}] ${result.reason || 'Risk check failed'}`,
          adjustedQuantity: result.adjustedQuantity,
          riskAmount: result.riskAmount,
        };
      }
    }

    // 所有規則都通過
    return {
      passed: true,
    };
  }

  /**
   * 取得目前已註冊嘅規則名稱（方便 debug）
   */
  getRegisteredRules(): string[] {
    return this.rules.map((rule) => rule.name);
  }
}
