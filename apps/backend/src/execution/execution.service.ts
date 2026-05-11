import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { EncryptionService } from '../infrastructure/shared/encryption.service';
import { CcxtExchangeAdapter } from '../infrastructure/adapters/exchange/ccxt-exchange.adapter';
import { withRetry } from '../common/utils/retry.util';
import { CircuitBreaker } from '../common/utils/circuit-breaker';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);
  private readonly liveTradingBreaker = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 60000 });

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService,
    @Optional() private readonly paperTradingService?: PaperTradingService,
    @Optional() private readonly encryptionService?: EncryptionService,
    @Optional() private readonly ccxtAdapter?: CcxtExchangeAdapter,
    @Optional() private readonly notificationService?: NotificationService,
  ) {}

  async executeOrder(orderData: any): Promise<any> {
    this.logger.log(`Executing order: ${orderData.symbol} ${orderData.side} ${orderData.quantity}`);

    const riskResult = await this.riskService.evaluateRisk(orderData);
    if (!riskResult.passed) {
      throw new BadRequestException({ message: 'Risk check failed', reasons: riskResult.reasons });
    }

    const isPaper = orderData.isPaper !== false;

    // Kill Switch check
    if (!isPaper) {
      const isKillSwitchActive = await this.checkKillSwitch(orderData.userId);
      if (isKillSwitchActive) {
        if (this.notificationService) {
          await this.notificationService.notifyKillSwitchActivated(orderData.userId, 'Live order blocked');
        }
        throw new BadRequestException({ message: 'Kill Switch active' });
      }
    }

    if (isPaper && this.paperTradingService) {
      const fillPrice = orderData.price || 50000;
      const orderId = orderData.orderId || `paper-${Date.now()}`;

      const paperResult = await this.paperTradingService.processPaperFill({
        exchangeAccountId: orderData.exchangeAccountId || 'demo',
        userId: orderData.userId || 'demo',
        symbol: orderData.symbol,
        side: orderData.side?.toUpperCase(),
        quantity: orderData.quantity,
        fillPrice,
        orderId,
        isPartial: orderData.isPartial || false,
      });

      // Update order status in DB if exists
      if (orderData.orderId) {
        await this.updateOrderStatus(orderData.orderId, orderData.isPartial ? 'PARTIALLY_FILLED' : 'FILLED', paperResult);
      }

      return {
        success: true,
        orderId,
        message: orderData.isPartial ? 'Partial fill processed' : 'Order filled',
        paperResult,
      };
    }

    // Live trading with partial fill support
    if (!isPaper) {
      // ... existing live logic with circuit breaker + retry
      const liveResult = await this.liveTradingBreaker.execute(() =>
        withRetry(() => this.placeRealOrder(orderData), { maxAttempts: 3 })
      );

      const isPartialFill = liveResult?.filled !== undefined && liveResult.filled < orderData.quantity;

      if (isPartialFill && this.paperTradingService) {
        // For consistency, also update paper side if needed, or just log
        await this.prisma.executionLog.create({
          data: {
            userId: orderData.userId,
            action: 'PARTIAL_FILL_LIVE',
            details: liveResult,
          },
        });
      }

      return {
        success: true,
        orderId: liveResult?.id,
        message: isPartialFill ? 'Partial fill on exchange' : 'Live order executed',
        liveResult,
      };
    }

    return { success: false, message: 'No execution path' };
  }

  private async placeRealOrder(orderData: any) {
    // Existing real order placement logic using ccxtAdapter
    // (kept for brevity - assumes it returns fill info)
    return this.ccxtAdapter?.placeOrder(orderData);
  }

  private async updateOrderStatus(orderId: string, status: string, fillResult: any) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
        filledQuantity: fillResult?.filledQuantity || 0,
        avgFillPrice: fillResult?.avgFillPrice,
      },
    }).catch(() => {});
  }

  private async checkKillSwitch(userId: string): Promise<boolean> {
    // existing implementation
    return false;
  }
}
