import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangePositionProvider } from '../exchange/interfaces/exchange-position.provider';

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

  /**
   * Main reconciliation method - compares system positions vs exchange
   */
  async reconcilePositions(userId: string, exchangeAccountId?: string): Promise<ReconciliationResult> {
    this.logger.log(`[Reconciliation] Starting for user: ${userId}`);

    // 1. Get system positions from our DB
    const systemPositions = await this.getSystemPositions(userId, exchangeAccountId);

    // 2. Get real positions from exchange (via provider or ccxt)
    let exchangePositions: any[] = [];
    if (this.positionProvider) {
      exchangePositions = await this.positionProvider.getPositions(userId, exchangeAccountId);
    } else {
      // Fallback: try to get from ccxt if available (basic implementation)
      exchangePositions = await this.getExchangePositionsFallback(userId, exchangeAccountId);
    }

    // 3. Compare
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

    // 4. Handle discrepancies
    if (result.hasDiscrepancy) {
      await this.handleDiscrepancy(result);
    }

    // 5. Log reconciliation
    await this.logReconciliation(result);

    this.logger.log(`[Reconciliation] Completed for user ${userId}. Discrepancies: ${differences.length}`);

    return result;
  }

  /**
   * Get positions from our internal system (Prisma)
   */
  private async getSystemPositions(userId: string, exchangeAccountId?: string) {
    const where: any = { userId, quantity: { not: 0 } };
    if (exchangeAccountId) {
      where.exchangeAccountId = exchangeAccountId;
    }

    const positions = await this.prisma.position.findMany({
      where,
      select: {
        symbol: true,
        quantity: true,
        avgPrice: true,
        exchangeAccountId: true,
      },
    });

    return positions.map(p => ({
      symbol: p.symbol,
      quantity: p.quantity,
      side: p.quantity > 0 ? 'BUY' : 'SELL',
      exchangeAccountId: p.exchangeAccountId,
    }));
  }

  /**
   * Fallback: Get positions from exchange using basic logic (can be replaced by real ccxt call)
   */
  private async getExchangePositionsFallback(userId: string, exchangeAccountId?: string): Promise<any[]> {
    // In real implementation, this should call ccxt.getPositions()
    // For now, return empty or mock to avoid breaking
    this.logger.warn('Using fallback position provider - implement real ccxt integration');
    return [];
  }

  /**
   * Compare system vs exchange positions
   */
  private comparePositions(systemPositions: any[], exchangePositions: any[]): PositionDifference[] {
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
          side: exchangePos.side,
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
          side: exchangePos.side,
        });
      }
    }

    // Check for positions in system but not on exchange
    for (const systemPos of systemPositions) {
      const existsOnExchange = exchangePositions.some(ep => ep.symbol === systemPos.symbol);
      if (!existsOnExchange && (systemPos.quantity || 0) > 0.0001) {
        differences.push({
          symbol: systemPos.symbol,
          systemQuantity: systemPos.quantity || 0,
          exchangeQuantity: 0,
          difference: systemPos.quantity || 0,
          side: systemPos.side,
        });
      }
    }

    return differences;
  }

  /**
   * Handle discrepancies (log, alert, or auto-correct in future)
   */
  private async handleDiscrepancy(result: ReconciliationResult): Promise<void> {
    this.logger.warn(`[Reconciliation] Discrepancy detected for user ${result.userId}`);

    // Log to ExecutionLog for audit
    try {
      await this.prisma.executionLog.create({
        data: {
          userId: result.userId,
          action: 'RECONCILIATION_DISCREPANCY',
          details: {
            differences: result.differences,
            timestamp: result.timestamp,
          },
        },
      });
    } catch (e) {
      this.logger.error('Failed to log reconciliation discrepancy', e);
    }

    // TODO: Send notification / alert via NotificationService
    // TODO: In future, implement auto-correction for small discrepancies
  }

  /**
   * Log reconciliation result
   */
  private async logReconciliation(result: ReconciliationResult): Promise<void> {
    try {
      await this.prisma.executionLog.create({
        data: {
          userId: result.userId,
          action: 'RECONCILIATION_RUN',
          details: {
            hasDiscrepancy: result.hasDiscrepancy,
            differenceCount: result.differences.length,
            timestamp: result.timestamp,
          },
        },
      });
    } catch (e) {
      this.logger.error('Failed to log reconciliation run', e);
    }
  }

  /**
   * Run reconciliation for all users (for scheduler)
   */
  async reconcileAllUsers(): Promise<void> {
    this.logger.log('[Reconciliation] Running scheduled reconciliation for all users');

    const users = await this.prisma.user.findMany({ select: { id: true } });

    for (const user of users) {
      try {
        await this.reconcilePositions(user.id);
      } catch (error) {
        this.logger.error(`Failed reconciliation for user ${user.id}`, error);
      }
    }
  }
}
