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
    // ... existing risk check and logic

    const isPaper = orderData.isPaper !== false;

    if (!isPaper) {
      const isKillSwitchActive = await this.checkKillSwitch(orderData.userId);
      if (isKillSwitchActive) {
        if (this.notificationService) {
          this.notificationService.notifyKillSwitchActivated(orderData.userId, 'Live order attempt blocked')
            .catch(() => {});
        }
        throw new BadRequestException({ message: 'Kill Switch is active. Live trading is disabled.' });
      }
    }

    // ... rest of the execution logic with circuit breaker and retry
  }

  // ... other methods
}
