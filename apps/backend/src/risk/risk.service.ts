import { Injectable, Logger } from '@nestjs/common';

export interface RiskEvaluationResult {
  passed: boolean;
  reasons: string[];
  suggestedSize?: number;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  async evaluateRisk(orderData: any): Promise<RiskEvaluationResult> {
    this.logger.log(`Evaluating risk for order: ${JSON.stringify(orderData)}`);
    
    const reasons: string[] = [];
    let passed = true;

    if (orderData.quantity && orderData.quantity > 1000) {
      reasons.push('Quantity exceeds max position size limit');
      passed = false;
    }

    if (orderData.isPaper) {
      passed = true;
      reasons.push('Paper trading mode - relaxed risk checks');
    }

    return {
      passed,
      reasons,
      suggestedSize: orderData.quantity ? Math.min(orderData.quantity, 100) : 10,
    };
  }

  registerRiskRule(ruleName: string, ruleFn: (data: any) => boolean) {
    this.logger.log(`Registered risk rule: ${ruleName}`);
  }
}