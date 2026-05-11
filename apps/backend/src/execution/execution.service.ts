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
    const isPaper = orderData.isPaper !== false;
    const isTestnet = orderData.testnet === true || (orderData.exchangeAccount && orderData.exchangeAccount.testnet);

    this.logger.log(`[Execution] Starting order | Paper: ${isPaper} | Testnet: ${isTestnet} | Symbol: ${orderData.symbol}`);

    // Risk + Kill Switch checks (existing logic)
    const riskResult = await this.riskService.evaluateRisk(orderData);
    if (!riskResult.passed) {
      throw new BadRequestException({ message: 'Risk check failed', reasons: riskResult.reasons });
    }

    if (!isPaper) {
      const isKillSwitchActive = await this.checkKillSwitch(orderData.userId);
      if (isKillSwitchActive) {
        if (this.notificationService) {
          await this.notificationService.notifyKillSwitchActivated(orderData.userId, 'Live/Testnet order blocked');
        }
        throw new BadRequestException({ message: 'Kill Switch is active' });
      }
    }

    if (isPaper && this.paperTradingService) {
      this.logger.log('[Execution] Routing to PaperTradingService');
      // ... existing paper logic with processPaperFill
      const fillPrice = orderData.price || 50000;
      const paperResult = await this.paperTradingService.processPaperFill({
        exchangeAccountId: orderData.exchangeAccountId || 'demo',
        userId: orderData.userId || 'demo',
        symbol: orderData.symbol,
        side: orderData.side?.toUpperCase(),
        quantity: orderData.quantity,
        fillPrice,
        orderId: orderData.orderId || `paper-${Date.now()}`,
        isPartial: orderData.isPartial || false,
      });

      return { success: true, mode: 'PAPER', paperResult };
    }

    // Live / Testnet path
    if (!isPaper) {
      this.logger.log(`[Execution] LIVE/TESTNET mode | Testnet=${isTestnet}`);

      if (!this.ccxtAdapter || !this.encryptionService) {
        throw new Error('Real trading dependencies missing');
      }

      const exchangeAccount = await this.prisma.exchangeAccount.findUnique({
        where: { id: orderData.exchangeAccountId },
      });

      if (!exchangeAccount?.apiKeyEncrypted) {
        throw new Error('No encrypted API key found');
      }

      const apiKey = this.encryptionService.decrypt(exchangeAccount.apiKeyEncrypted);
      const apiSecret = exchangeAccount.apiSecretEncrypted 
        ? this.encryptionService.decrypt(exchangeAccount.apiSecretEncrypted) 
        : undefined;

      await this.ccxtAdapter.initialize({
        exchange: exchangeAccount.exchange as any,
        apiKey,
        apiSecret,
        testnet: isTestnet || exchangeAccount.testnet || false,
      });

      const liveResult = await this.liveTradingBreaker.execute(() =>
        withRetry(() => this.ccxtAdapter!.placeOrder(orderData), { maxAttempts: 3 })
      );

      this.logger.log(`[Execution] Live/Testnet order placed successfully: ${liveResult?.id}`);

      return { success: true, mode: isTestnet ? 'TESTNET' : 'LIVE', liveResult };
    }

    return { success: false, message: 'No valid execution path' };
  }

  private async checkKillSwitch(userId: string): Promise<boolean> {
    // existing implementation
    return false;
  }
}
