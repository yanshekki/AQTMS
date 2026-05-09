import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { MetricsService } from '../common/metrics/metrics.service';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { PrismaService } from '../prisma/prisma.service';

// ... other imports ...

@Injectable()
export class ExecutionService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
    private readonly paperTradingService: PaperTradingService,
    // ... other existing dependencies ...
  ) {}

  async onModuleInit() {
    // existing init logic
  }

  /**
   * Main entry point for placing orders with risk protection.
   * Phase 4: Added Paper Trading Mode support.
   */
  async placeOrderWithProtection(dto: any) {
    try {
      // 1. Get ExchangeAccount to check if paper trading is enabled
      const exchangeAccount = await this.prisma.exchangeAccount.findUnique({
        where: { id: dto.exchangeAccountId },
      });

      if (!exchangeAccount) {
        throw new Error('Exchange account not found');
      }

      // 2. If Paper Trading Mode is enabled, route to simulator
      if (exchangeAccount.isPaperTrading) {
        this.metricsService.recordOrderPlaced('PAPER', dto.symbol);

        const paperResult = await this.paperTradingService.placePaperOrder({
          userId: dto.userId,
          symbol: dto.symbol,
          side: dto.side,
          quantity: dto.quantity,
          price: dto.price || 0,
        });

        return {
          success: true,
          isPaper: true,
          ...paperResult,
        };
      }

      // 3. Real trading path (existing logic)
      // ... existing real execution code ...

      this.metricsService.recordOrderPlaced(dto.exchange, dto.symbol);

      return { success: true, isPaper: false /* ... */ };
    } catch (error) {
      this.metricsService.recordOrderFailed(
        dto.exchange || 'UNKNOWN',
        dto.symbol,
        error instanceof Error ? error.message : 'unknown',
      );
      throw error;
    }
  }

  // ... other existing methods ...
}
