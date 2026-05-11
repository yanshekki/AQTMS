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

  async executeOrder(orderData: any, authenticatedUserId?: string): Promise<any> {
    const userId = authenticatedUserId || orderData.userId || 'demo-user';

    this.logger.log(`[Execution] User=${userId} | Mode=${orderData.isPaper ? 'PAPER' : orderData.testnet ? 'TESTNET' : 'LIVE'} | ${orderData.symbol}`);

    const riskResult = await this.riskService.evaluateRisk(orderData);
    if (!riskResult.passed) {
      throw new BadRequestException({ message: 'Risk check failed', reasons: riskResult.reasons });
    }

    const isPaper = orderData.isPaper !== false;
    const isTestnet = orderData.testnet === true;

    if (!isPaper) {
      const isKillSwitchActive = await this.checkKillSwitch(userId);
      if (isKillSwitchActive) {
        if (this.notificationService) {
          await this.notificationService.notifyKillSwitchActivated(userId, 'Order blocked');
        }
        throw new BadRequestException({ message: 'Kill Switch is active' });
      }
    }

    if (isPaper && this.paperTradingService) {
      const result = await this.executePaperOrder(orderData, userId);
      await this.syncPositionAfterExecution(result, orderData, userId);
      return result;
    }

    if (!isPaper) {
      const result = await this.executeRealOrder(orderData, isTestnet ? 'TESTNET' : 'LIVE', userId);
      await this.syncPositionAfterExecution(result, orderData, userId);
      return result;
    }

    return { success: false, message: 'No execution path' };
  }

  private async executePaperOrder(orderData: any, userId: string) {
    const orderId = orderData.orderId || `paper-${Date.now()}`;

    await this.prisma.order.upsert({
      where: { id: orderId },
      update: {
        status: 'FILLED',
        filledQuantity: orderData.quantity,
        updatedAt: new Date(),
      },
      create: {
        id: orderId,
        userId,
        exchangeAccountId: orderData.exchangeAccountId || 'demo-paper',
        symbol: orderData.symbol,
        side: orderData.side?.toUpperCase() || 'BUY',
        type: orderData.type || 'MARKET',
        quantity: orderData.quantity,
        price: orderData.price,
        status: 'FILLED',
        isPaper: true,
        filledQuantity: orderData.quantity,
      },
    });

    return { success: true, mode: 'PAPER', orderId };
  }

  private async executeRealOrder(orderData: any, mode: string, userId: string) {
    const orderId = `live-${Date.now()}`;

    await this.prisma.order.create({
      data: {
        id: orderId,
        userId,
        exchangeAccountId: orderData.exchangeAccountId,
        symbol: orderData.symbol,
        side: orderData.side?.toUpperCase(),
        type: orderData.type || 'MARKET',
        quantity: orderData.quantity,
        price: orderData.price,
        status: 'PENDING',
        isPaper: false,
      },
    });

    return { success: true, mode, orderId };
  }

  private async syncPositionAfterExecution(result: any, orderData: any, userId: string) {
    if (!result.success) return;

    const symbol = orderData.symbol;
    const quantity = orderData.quantity || 0;
    const side = orderData.side?.toUpperCase();
    const exchangeAccountId = orderData.exchangeAccountId || 'demo-paper';

    const existing = await this.prisma.position.findUnique({
      where: { exchangeAccountId_symbol: { exchangeAccountId, symbol } },
    });

    let newQty = existing ? existing.quantity : 0;
    if (side === 'BUY') newQty += quantity;
    else newQty -= quantity;

    await this.prisma.position.upsert({
      where: { exchangeAccountId_symbol: { exchangeAccountId, symbol } },
      update: { quantity: newQty, updatedAt: new Date() },
      create: {
        userId,
        exchangeAccountId,
        symbol,
        quantity: newQty,
      },
    });

    this.logger.log(`[Position] Synced ${symbol} → ${newQty}`);
  }

  private async checkKillSwitch(userId: string): Promise<boolean> {
    return false;
  }
}
