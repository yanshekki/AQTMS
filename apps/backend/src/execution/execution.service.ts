import { Injectable, Logger, BadRequestException, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService, RiskEvaluationResult } from '../risk/risk.service';
import { PaperTradingService } from '../paper-trading/paper-trading.service';

export interface OrderExecutionResult {
  success: boolean;
  orderId?: string;
  executionPrice?: number;
  message: string;
  riskResult?: RiskEvaluationResult;
  paperResult?: any;
}

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService,
    @Optional() private readonly paperTradingService?: PaperTradingService,
  ) {}

  async executeOrder(orderData: any): Promise<OrderExecutionResult> {
    this.logger.log(`Executing order for symbol: ${orderData.symbol}, side: ${orderData.side}, isPaper: ${orderData.isPaper}`);

    const riskResult = await this.riskService.evaluateRisk(orderData);

    if (!riskResult.passed) {
      this.logger.warn(`Risk check failed: ${riskResult.reasons.join(', ')}`);
      throw new BadRequestException({
        message: 'Order rejected due to risk rules',
        reasons: riskResult.reasons,
      });
    }

    const isPaper = orderData.isPaper !== false; // default to paper if not explicitly false

    if (isPaper && this.paperTradingService) {
      // Deep integration: use PaperTradingService for real virtual balance / PnL updates
      const simulatedPrice = orderData.price || (await this.getSimulatedPrice(orderData.symbol));
      const orderId = orderData.orderId || `paper-${Date.now()}`;

      try {
        const paperResult = await this.paperTradingService.processPaperFill({
          exchangeAccountId: orderData.exchangeAccountId || 'demo-paper-account',
          userId: orderData.userId || 'demo-user',
          symbol: orderData.symbol,
          side: orderData.side?.toUpperCase() || 'BUY',
          quantity: orderData.quantity || 0.001,
          fillPrice: simulatedPrice,
          orderId,
          isPartial: orderData.isPartial || false,
        });

        await this.prisma.executionLog.create({
          data: {
            userId: orderData.userId || 'demo-user',
            orderId,
            action: 'PLACE_PAPER_ORDER',
            details: {
              ...orderData,
              riskResult,
              paperResult,
              simulatedPrice,
            },
          },
        }).catch((e) => this.logger.warn('Log failed', e.message));

        this.logger.log(`Paper order fully processed with virtual balance/PnL update: ${orderId}`);

        return {
          success: true,
          orderId,
          executionPrice: simulatedPrice,
          message: 'Paper order executed with real virtual balance & PnL tracking',
          riskResult,
          paperResult,
        };
      } catch (err: any) {
        this.logger.error('PaperTradingService processPaperFill failed, falling back to simple sim', err);
        // fallback simple
      }
    }

    // Fallback simple paper or real placeholder
    if (isPaper) {
      const simulatedPrice = orderData.price || 50000;
      const orderId = `paper-${Date.now()}`;

      await this.prisma.executionLog.create({
        data: {
          userId: orderData.userId || 'demo-user',
          orderId,
          action: 'PLACE_ORDER',
          details: { ...orderData, riskResult, simulatedPrice },
        },
      }).catch((err) => this.logger.error('Failed to log execution', err));

      this.logger.log(`Paper order executed (simple fallback): ${orderId} at simulated price ${simulatedPrice}`);

      return {
        success: true,
        orderId,
        executionPrice: simulatedPrice,
        message: 'Paper order executed successfully (simulated fallback)',
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

  private async getSimulatedPrice(symbol: string): Promise<number> {
    // In real impl, could use market-data or last price
    return 50000 + Math.random() * 1000 - 500; // slight variation
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