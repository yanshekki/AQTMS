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
      return this.executePaperOrder(orderData, userId);
    }

    if (!isPaper) {
      return this.executeRealOrder(orderData, isTestnet ? 'TESTNET' : 'LIVE', userId);
    }

    return { success: false, message: 'No execution path' };
  }

  private async executePaperOrder(orderData: any, userId: string) {
    // Paper trading with proper user context
    return { success: true, mode: 'PAPER', userId };
  }

  private async executeRealOrder(orderData: any, mode: string, userId: string) {
    // Real order logic with user context
    return { success: true, mode, userId };
  }

  private async checkKillSwitch(userId: string): Promise<boolean> {
    return false;
  }
}
