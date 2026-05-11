import { Injectable } from '@nestjs/common';
import { RiskEvaluationUseCase } from './risk-evaluation.use-case';
import { ExecutionService } from '../services/execution.service';
import { Order } from '../../domain/entities/order.entity';

export interface ExecuteTradeResult {
  success: boolean;
  orderId?: string;
  message: string;
  riskResult?: any;
}

@Injectable()
export class ExecuteTradeUseCase {
  constructor(
    private readonly riskEvaluationUseCase: RiskEvaluationUseCase,
    private readonly executionService: ExecutionService,
  ) {}

  async execute(orderData: Partial<Order>): Promise<ExecuteTradeResult> {
    // Step 1: Risk Evaluation
    const riskResult = await this.riskEvaluationUseCase.execute(orderData);

    if (!riskResult.passed) {
      return {
        success: false,
        message: `Risk check failed: ${riskResult.reasons.join(', ')}`,
        riskResult,
      };
    }

    // Step 2: Execute (paper or live)
    const executionResult = await this.executionService.executeOrder(orderData);

    return {
      success: executionResult.success,
      orderId: executionResult.orderId,
      message: executionResult.message,
      riskResult,
    };
  }
}
