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
    if (!this.positionProvider) {
      this.logger.warn('No position provider available for reconciliation');
      return { success: false, message: 'Position provider not available' };
    }

    try {
      const exchangePositions = await (this.positionProvider as any).getPositions(userId, exchangeAccountId);

      const dbPositions = await this.prisma.position.findMany({
        where: { userId, ...(exchangeAccountId && { exchangeAccountId }) },
      });

      const discrepancies = this.findDiscrepancies(dbPositions, exchangePositions);

      const result = {
        success: true,
        hasDiscrepancy: discrepancies.length > 0,
        differences: discrepancies,
        exchangePositions,
        dbPositions,
      };

      if ((result as any).hasDiscrepancy && this.notificationService) {
        (this.notificationService as any)
          .notifyReconciliationDiscrepancy(userId, discrepancies as any)
          .catch(() => this.logger.warn('Failed to send reconciliation notification'));
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Reconciliation failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  private findDiscrepancies(dbPositions: any[], exchangePositions: any[]): any[] {
    // TODO: Implement real discrepancy detection logic
    return [];
  }
}
