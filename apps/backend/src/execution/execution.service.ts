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
    const isTestnet = this.isTestnetMode(orderData);

    this.logger.log(
      `[Execution] Mode: ${isPaper ? 'PAPER' : isTestnet ? 'TESTNET' : 'LIVE'} | ${orderData.symbol} ${orderData.side} x${orderData.quantity}`
    );

    // Risk check
    const riskResult = await this.riskService.evaluateRisk(orderData);
    if (!riskResult.passed) {
      throw new BadRequestException({ message: 'Risk check failed', reasons: riskResult.reasons });
    }

    // Kill Switch for non-paper
    if (!isPaper) {
      const isKillSwitchActive = await this.checkKillSwitch(orderData.userId);
      if (isKillSwitchActive) {
        if (this.notificationService) {
          await this.notificationService.notifyKillSwitchActivated(orderData.userId, 'Order blocked by Kill Switch');
        }
        throw new BadRequestException({ message: 'Kill Switch is active' });
      }
    }

    // Paper Trading
    if (isPaper && this.paperTradingService) {
      this.logger.log('[Execution] → PaperTradingService');
      const fillPrice = orderData.price || 50000;
      const paperResult = await this.paperTradingService.processPaperFill({
        exchangeAccountId: orderData.exchangeAccountId || 'demo-paper',
        userId: orderData.userId || 'demo-user',
        symbol: orderData.symbol,
        side: orderData.side?.toUpperCase() || 'BUY',
        quantity: orderData.quantity,
        fillPrice,
        orderId: orderData.orderId || `paper-${Date.now()}`,
        isPartial: orderData.isPartial || false,
      });

      return {
        success: true,
        mode: 'PAPER',
        result: paperResult,
      };
    }

    // Testnet or Live
    if (!isPaper) {
      const modeLabel = isTestnet ? 'TESTNET' : 'LIVE';
      this.logger.log(`[Execution] → ${modeLabel} via ccxt`);

      if (!this.ccxtAdapter || !this.encryptionService) {
        throw new Error('Missing ccxtAdapter or EncryptionService for real trading');
      }

      const exchangeAccount = await this.prisma.exchangeAccount.findUnique({
        where: { id: orderData.exchangeAccountId },
      });

      if (!exchangeAccount?.apiKeyEncrypted) {
        throw new Error('No encrypted API keys found for this account');
      }

      const apiKey = this.encryptionService.decrypt(exchangeAccount.apiKeyEncrypted);
      const apiSecret = exchangeAccount.apiSecretEncrypted
        ? this.encryptionService.decrypt(exchangeAccount.apiSecretEncrypted)
        : undefined;

      const useTestnet = isTestnet || exchangeAccount.testnet || false;

      await this.ccxtAdapter.initialize({
        exchange: exchangeAccount.exchange as any,
        apiKey,
        apiSecret,
        testnet: useTestnet,
      });

      // Safety warning for first live orders
      if (!useTestnet) {
        this.logger.warn('[Execution] ⚠️ LIVE TRADING - Real money at risk!');
      }

      const liveResult = await this.liveTradingBreaker.execute(() =>
        withRetry(
          () => this.ccxtAdapter!.placeOrder(orderData),
          { maxAttempts: 3, initialDelayMs: 800 }
        )
      );

      this.logger.log(`[Execution] ${modeLabel} order successful: ${liveResult?.id}`);

      return {
        success: true,
        mode: modeLabel,
        result: liveResult,
      };
    }

    return { success: false, message: 'No execution path available' };
  }

  private isTestnetMode(orderData: any): boolean {
    if (orderData.testnet === true) return true;
    if (orderData.exchangeAccount?.testnet === true) return true;
    return false;
  }

  private async checkKillSwitch(userId: string): Promise<boolean> {
    try {
      const safety = await this.prisma.safetySetting?.findFirst?.({ where: { userId } });
      return safety?.killSwitchActive === true;
    } catch {
      return false;
    }
  }
}
