import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService, RiskEvaluationResult } from '../risk/risk.service';

export interface OrderExecutionResult {
  success: boolean;
  orderId?: string;
  executionPrice?: number;
  message: string;
  riskResult?: RiskEvaluationResult;
}

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService,
  ) {}

  async executeOrder(orderData: any): Promise<OrderExecutionResult> {
    this.logger.log(`Executing order for symbol: ${orderData.symbol}, side: ${orderData.side}`);

    const riskResult = await this.riskService.evaluateRisk(orderData);
    
    if (!riskResult.passed) {
      this.logger.warn(`Risk check failed: ${riskResult.reasons.join(', ')}`);
      throw new BadRequestException({
        message: 'Order rejected due to risk rules',
        reasons: riskResult.reasons,
      });
    }

    if (orderData.isPaper !== false) {
      const simulatedPrice = orderData.price || 50000;
      const orderId = `paper-${Date.now()}`;

      await this.prisma.executionLog.create({
        data: {
          userId: orderData.userId || 'demo-user',
          orderId,
          action: 'PLACE_ORDER',
          details: {
            ...orderData,
            riskResult,
            simulatedPrice,
          },
        },
      }).catch(err => this.logger.error('Failed to log execution', err));

      this.logger.log(`Paper order executed: ${orderId} at simulated price ${simulatedPrice}`);

      return {
        success: true,
        orderId,
        executionPrice: simulatedPrice,
        message: 'Paper order executed successfully (simulated)',
        riskResult,
      };
    }

    this.logger.log('Real trading execution would use ccxt adapter here');
    
    return {
      success: true,
      message: 'Real order execution placeholder - integrate ccxt here',
      riskResult,
    };
  }

  registerRiskRule(ruleName: string, ruleFn: (data: any) => boolean): void {
    this.riskService.registerRiskRule(ruleName, ruleFn);
    this.logger.log(`ExecutionService: Risk rule '${ruleName}' registered via RiskService`);
  }

  async cancelOrder(orderId: string, userId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Cancelling order: ${orderId}`);
    return {
      success: true,
      message: `Order ${orderId} cancelled (demo)`,
    };
  }
}