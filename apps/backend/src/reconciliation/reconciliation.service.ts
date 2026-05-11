import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangePositionProvider } from '../exchange/interfaces/exchange-position.provider';

// ... (keep the interfaces PositionDifference and ReconciliationResult)

export interface PositionDifference {
  symbol: string;
  systemQuantity: number;
  exchangeQuantity: number;
  difference: number;
  side?: string;
}

export interface ReconciliationResult {
  userId: string;
  exchangeAccountId?: string;
  timestamp: Date;
  totalSystemPositions: number;
  totalExchangePositions: number;
  differences: PositionDifference[];
  hasDiscrepancy: boolean;
  actionTaken?: string;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('EXCHANGE_POSITION_PROVIDER')
    private readonly positionProvider?: ExchangePositionProvider,
  ) {}

  async reconcilePositions(userId: string, exchangeAccountId?: string): Promise<ReconciliationResult> {
    this.logger.log(`[Reconciliation] Starting for user: ${userId}`);

    const systemPositions = await this.getSystemPositions(userId, exchangeAccountId);

    let exchangePositions: any[] = [];
    if (this.positionProvider) {
      // Use real provider
      exchangePositions = await this.positionProvider.getPositions(userId, exchangeAccountId);
    } else {
      this.logger.warn('No ExchangePositionProvider found - using empty data');
      exchangePositions = [];
    }

    const differences = this.comparePositions(systemPositions, exchangePositions);

    const result: ReconciliationResult = {
      userId,
      exchangeAccountId,
      timestamp: new Date(),
      totalSystemPositions: systemPositions.length,
      totalExchangePositions: exchangePositions.length,
      differences,
      hasDiscrepancy: differences.length > 0,
    };

    if (result.hasDiscrepancy) {
      await this.handleDiscrepancy(result);
    }

    await this.logReconciliation(result);

    return result;
  }

  // ... (keep the rest of the methods: getSystemPositions, comparePositions, handleDiscrepancy, logReconciliation, reconcileAllUsers)
  private async getSystemPositions(userId: string, exchangeAccountId?: string) {
    const where: any = { userId, quantity: { not: 0 } };
    if (exchangeAccountId) where.exchangeAccountId = exchangeAccountId;

    const positions = await this.prisma.position.findMany({ where });
    return positions.map(p => ({
      symbol: p.symbol,
      quantity: p.quantity,
      side: p.quantity > 0 ? 'BUY' : 'SELL',
    }));
  }

  private comparePositions(systemPositions: any[], exchangePositions: any[]): PositionDifference[] {
    // ... (keep existing compare logic)
    const differences: PositionDifference[] = [];
    const systemMap = new Map(systemPositions.map(p => [p.symbol, p]));

    for (const exchangePos of exchangePositions) {
      const systemPos = systemMap.get(exchangePos.symbol);
      if (!systemPos) {
        differences.push({
          symbol: exchangePos.symbol,
          systemQuantity: 0,
          exchangeQuantity: exchangePos.quantity || 0,
          difference: exchangePos.quantity || 0,
        });
        continue;
      }
      const diff = (systemPos.quantity || 0) - (exchangePos.quantity || 0);
      if (Math.abs(diff) > 0.0001) {
        differences.push({
          symbol: exchangePos.symbol,
          systemQuantity: systemPos.quantity || 0,
          exchangeQuantity: exchangePos.quantity || 0,
          difference: diff,
        });
      }
    }
    return differences;
  }

  private async handleDiscrepancy(result: ReconciliationResult) {
    this.logger.warn(`Discrepancy for user ${result.userId}`);
    await this.prisma.executionLog.create({
      data: {
        userId: result.userId,
        action: 'RECONCILIATION_DISCREPANCY',
        details: result,
      },
    }).catch(() => {});
  }

  private async logReconciliation(result: ReconciliationResult) {
    await this.prisma.executionLog.create({
      data: {
        userId: result.userId,
        action: 'RECONCILIATION_RUN',
        details: result,
      },
    }).catch(() => {});
  }

  async reconcileAllUsers() {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    for (const user of users) {
      await this.reconcilePositions(user.id).catch(err => 
        this.logger.error(`Reconciliation failed for ${user.id}`, err)
      );
    }
  }
}
