import { Injectable } from '@nestjs/common';
import { RiskParams } from '../../domain/value-objects/risk-params.vo';

@Injectable()
export class RiskService {
  private riskRules: Array<(order: any) => boolean> = [];

  registerRiskRule(ruleFn: (order: any) => boolean): void {
    this.riskRules.push(ruleFn);
  }

  async evaluateRisk(order: any): Promise<{ passed: boolean; reasons: string[]; riskScore?: number }> {
    const reasons: string[] = [];
    let passed = true;

    // Basic checks
    if (!order.symbol || !order.side || !order.quantity) {
      reasons.push('Missing required order fields');
      passed = false;
    }

    if (order.quantity <= 0) {
      reasons.push('Quantity must be positive');
      passed = false;
    }

    // Custom registered rules
    for (const rule of this.riskRules) {
      if (!rule(order)) {
        reasons.push('Custom risk rule failed');
        passed = false;
      }
    }

    // TODO: Integrate with RiskParams from user config, VaR, Kelly, ATR etc.
    const riskScore = passed ? 0.2 : 0.8; // placeholder

    return { passed, reasons, riskScore };
  }
}
