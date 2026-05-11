import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangePositionProvider } from '../exchange/interfaces/exchange-position.provider';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('EXCHANGE_POSITION_PROVIDER')
    private readonly positionProvider?: ExchangePositionProvider,
    @Optional() private readonly notificationService?: NotificationService,
  ) {}

  async reconcilePositions(userId: string, exchangeAccountId?: string): Promise<any> {
    // ... existing logic
    const result = { /* ... */ };

    if (result.hasDiscrepancy && this.notificationService) {
      this.notificationService.notifyReconciliationDiscrepancy(userId, result.differences)
        .catch(() => this.logger.warn('Failed to send reconciliation notification'));
    }

    return result;
  }

  // ... rest of the class
}
