import { Injectable } from '@nestjs/common';
import { RiskService } from '../services/risk.service';
import { Order } from '../../domain/entities/order.entity';

export interface RiskEvaluationResult {
  passed: boolean;
  reasons: string[];
  riskScore?: number;
}

@Injectable()
export class RiskEvaluationUseCase {
  constructor(private readonly riskService: RiskService) {}

  async execute(order: Partial<Order>): Promise<RiskEvaluationResult> {
    const result = await this.riskService.evaluateRisk(order);
    return {
      passed: result.passed,
      reasons: result.reasons || [],
      riskScore: result.riskScore,
    };
  }
}
