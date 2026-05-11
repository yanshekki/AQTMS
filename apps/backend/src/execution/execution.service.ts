import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { PaperTradingService } from '../paper-trading/paper-trading.service';

export interface OrderExecutionResult {
  success: boolean;
  orderId?: string;
  executionPrice?: number;
  message: string;
  riskResult?: any;
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
    this.logger.log(`Executing order for symbol: ${orderData.symbol}, side: ${orderData.side}`);

    const riskResult = await this.riskService.evaluateRisk(orderData);

    if (!riskResult.passed) {
      this.logger.warn(`Risk check failed: ${riskResult.reasons.join(', ')}`);
      throw new BadRequestException({
        message: 'Order rejected due to risk rules',
        reasons: riskResult.reasons,
      });
    }

    const isPaper = orderData.isPaper !== false;

    if (isPaper && this.paperTradingService) {
      // Deep integration with PaperTrading
      const simulatedPrice = orderData.price || 50000;
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
        });

        await this.prisma.executionLog.create({
          data: {
            userId: orderData.userId || 'demo-user',
            orderId,
            action: 'PLACE_PAPER_ORDER',
            details: { ...orderData, riskResult, paperResult, simulatedPrice },
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
        this.logger.error('PaperTrading integration failed, falling back', err);
      }
    }

    // Fallback simple paper or real
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
      }).catch((err) => this.logger.error('Failed to log', err));

      return {
        success: true,
        orderId,
        executionPrice: simulatedPrice,
        message: 'Paper order executed (simple fallback)',
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

  async cancelOrder(orderId: string, userId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Cancelling order: ${orderId}`);
    return {
      success: true,
      message: `Order ${orderId} cancelled (demo)`,
    };
  }
}
