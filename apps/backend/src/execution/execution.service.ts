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

  /**
   * Main entry point for order execution.
   * Supports three modes: PAPER, TESTNET, LIVE
   */
  async executeOrder(orderData: any): Promise<any> {
    const mode = this.detectExecutionMode(orderData);
    this.logger.log(`[Execution] Mode detected: ${mode} | ${orderData.symbol} ${orderData.side} x${orderData.quantity}`);

    // Risk evaluation (always)
    const riskResult = await this.riskService.evaluateRisk(orderData);
    if (!riskResult.passed) {
      throw new BadRequestException({ message: 'Risk check failed', reasons: riskResult.reasons });
    }

    // Kill Switch protection for non-paper modes
    if (mode !== 'PAPER') {
      const isKillSwitchActive = await this.checkKillSwitch(orderData.userId);
      if (isKillSwitchActive) {
        if (this.notificationService) {
          await this.notificationService.notifyKillSwitchActivated(orderData.userId, `Order blocked in ${mode} mode`);
        }
        throw new BadRequestException({ message: 'Kill Switch is active. Trading disabled.' });
      }
    }

    if (mode === 'PAPER' && this.paperTradingService) {
      return this.executePaperOrder(orderData);
    }

    if (mode === 'TESTNET' || mode === 'LIVE') {
      return this.executeRealOrder(orderData, mode);
    }

    throw new Error('Unsupported execution mode');
  }

  private detectExecutionMode(orderData: any): 'PAPER' | 'TESTNET' | 'LIVE' {
    if (orderData.isPaper === true) return 'PAPER';
    if (orderData.testnet === true) return 'TESTNET';
    // fallback to ExchangeAccount setting
    if (orderData.exchangeAccountId) {
      // In real usage, you would fetch and check account.testnet here
    }
    return 'LIVE';
  }

  private async executePaperOrder(orderData: any) {
    this.logger.log('[Execution] Executing in PAPER mode');
    const fillPrice = orderData.price || 50000;
    const paperResult = await this.paperTradingService!.processPaperFill({
      exchangeAccountId: orderData.exchangeAccountId || 'demo-paper',
      userId: orderData.userId || 'demo-user',
      symbol: orderData.symbol,
      side: orderData.side?.toUpperCase() || 'BUY',
      quantity: orderData.quantity,
      fillPrice,
      orderId: orderData.orderId || `paper-${Date.now()}`,
      isPartial: orderData.isPartial || false,
    });

    return { success: true, mode: 'PAPER', result: paperResult };
  }

  private async executeRealOrder(orderData: any, mode: 'TESTNET' | 'LIVE') {
    this.logger.log(`[Execution] Executing in ${mode} mode`);

    if (!this.ccxtAdapter || !this.encryptionService) {
      throw new Error('Real trading requires ccxtAdapter and EncryptionService');
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

    const useTestnet = mode === 'TESTNET' || exchangeAccount.testnet === true;

    await this.ccxtAdapter.initialize({
      exchange: exchangeAccount.exchange as any,
      apiKey,
      apiSecret,
      testnet: useTestnet,
    });

    if (mode === 'LIVE') {
      this.logger.warn('⚠️ LIVE TRADING - Real funds at risk!');
    }

    const result = await this.liveTradingBreaker.execute(() =>
      withRetry(() => this.ccxtAdapter!.placeOrder(orderData), { maxAttempts: 3 })
    );

    return { success: true, mode, result };
  }

  private async checkKillSwitch(userId: string): Promise<boolean> {
    try {
      const safety = await this.prisma.safetySetting?.findFirst?.({ where: { userId } });
      return safety?.killSwitchActive === true;
    } catch {
      return false;
    }
  }

  /**
   * Helper for testing: Validate if system is ready for testnet/live
   */
  async validateTestingEnvironment(userId: string, exchangeAccountId: string): Promise<{ ready: boolean; issues: string[] }> {
    const issues: string[] = [];

    const account = await this.prisma.exchangeAccount.findUnique({ where: { id: exchangeAccountId } });
    if (!account) issues.push('ExchangeAccount not found');
    if (account && !account.apiKeyEncrypted) issues.push('No API key configured');

    const isKillSwitchActive = await this.checkKillSwitch(userId);
    if (isKillSwitchActive) issues.push('Kill Switch is currently active');

    return {
      ready: issues.length === 0,
      issues,
    };
  }
}
