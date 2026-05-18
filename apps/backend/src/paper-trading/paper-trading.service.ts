import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';

@Injectable()
export class PaperTradingService {
  private readonly logger = new Logger(PaperTradingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly marketDataService?: MarketDataService,
  ) {}

  /**
   * Get current virtual paper balance for an exchange account
   */
  async getVirtualBalance(exchangeAccountId: string): Promise<number> {
    const account = await this.prisma.exchangeAccount.findUnique({
      where: { id: exchangeAccountId },
      select: { paperVirtualBalance: true },
    });
    return account?.paperVirtualBalance ?? 10000;
  }

  /**
   * Update virtual balance (positive = credit on sell, negative = debit on buy)
   */
  async updateVirtualBalance(exchangeAccountId: string, delta: number, reason = 'TRADE'): Promise<void> {
    await this.prisma.exchangeAccount.update({
      where: { id: exchangeAccountId },
      data: { paperVirtualBalance: { increment: delta } },
    }).catch((e) => this.logger.error('Failed to update paper balance', e));
    this.logger.log(`Paper balance updated for ${exchangeAccountId}: ${delta > 0 ? '+' : ''}${delta} (${reason})`);
  }

  /**
   * Get or create a Position record for paper trading
   */
  private async getOrCreatePosition(exchangeAccountId: string, symbol: string, userId: string) {
    let position = await this.prisma.position.findUnique({
      where: {
        exchangeAccountId_symbol: {
          exchangeAccountId,
          symbol,
        },
      },
    });

    if (!position) {
      position = await this.prisma.position.create({
        data: {
          userId,
          exchangeAccountId,
          symbol,
          quantity: 0,
          avgPrice: 0,
          unrealizedPnl: 0,
          realizedPnl: 0,
        },
      });
      this.logger.log(`Created new paper position for ${symbol}`);
    }
    return position;
  }

  /**
   * Core: Process a paper trade fill - updates balance, position, PnL
   * This is the key integration point for real virtual trading simulation
   */
  async processPaperFill(params: {
    exchangeAccountId: string;
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    fillPrice: number;
    orderId?: string;
    isPartial?: boolean;
  }): Promise<{
    success: boolean;
    position?: any;
    realizedPnlDelta: number;
    newBalance: number;
    message: string;
  }> {
    const { exchangeAccountId, userId, symbol, side, quantity, fillPrice, orderId, isPartial } = params;

    if (!exchangeAccountId || !userId || !symbol || !side || !quantity || !fillPrice) {
      throw new Error('Missing required params for paper fill');
    }

    const position = await this.getOrCreatePosition(exchangeAccountId, symbol, userId);
    const currentQty = position.quantity || 0;
    const currentAvg = position.avgPrice || fillPrice;

    let newQty = currentQty;
    let newAvg = currentAvg;
    let realizedPnlDelta = 0;

    const costOrProceeds = quantity * fillPrice;

    if (side === 'BUY') {
      // Weighted average price for new position
      if (currentQty > 0) {
        const totalCost = currentQty * currentAvg + quantity * fillPrice;
        newQty = currentQty + quantity;
        newAvg = totalCost / newQty;
      } else {
        newQty = quantity;
        newAvg = fillPrice;
      }

      // Debit balance
      await this.updateVirtualBalance(exchangeAccountId, -costOrProceeds, 'BUY_FILL');
      this.logger.log(`PAPER BUY: ${quantity} ${symbol} @ ${fillPrice}, cost: ${costOrProceeds}`);
    } else {
      // SELL - reduce position, realize PnL
      newQty = Math.max(0, currentQty - quantity);

      if (currentQty > 0 && currentAvg > 0) {
        const qtyToClose = Math.min(quantity, currentQty);
        realizedPnlDelta = (fillPrice - currentAvg) * qtyToClose;
      }

      // Credit balance with proceeds
      await this.updateVirtualBalance(exchangeAccountId, costOrProceeds, 'SELL_FILL');
      this.logger.log(`PAPER SELL: ${quantity} ${symbol} @ ${fillPrice}, proceeds: ${costOrProceeds}, realizedPnL: ${realizedPnlDelta}`);
    }

    // Update position in DB
    const updatedPosition = await this.prisma.position.update({
      where: { id: position.id },
      data: {
        quantity: parseFloat(newQty.toFixed(8)),
        avgPrice: parseFloat(newAvg.toFixed(2)),
        realizedPnl: { increment: parseFloat(realizedPnlDelta.toFixed(2)) },
        updatedAt: new Date(),
      },
    });

    // Create execution log
    await this.prisma.executionLog.create({
      data: {
        userId,
        orderId: orderId || `paper-${Date.now()}`,
        action: 'PAPER_FILL',
        details: {
          ...params,
          realizedPnlDelta: parseFloat(realizedPnlDelta.toFixed(2)),
          newPositionQty: newQty,
          newAvgPrice: newAvg,
        },
      },
    }).catch((e) => this.logger.warn('ExecutionLog create failed (non-critical)', e.message));

    const newBalance = await this.getVirtualBalance(exchangeAccountId);

    return {
      success: true,
      position: updatedPosition,
      realizedPnlDelta: parseFloat(realizedPnlDelta.toFixed(2)),
      newBalance: parseFloat(newBalance.toFixed(2)),
      message: `Paper ${side} fill processed successfully${isPartial ? ' (partial)' : ''}`,
    };
  }

  /**
   * Get paper positions for user, enriched with live price + unrealized PnL
   * (used by PortfolioService and /paper-trading/positions endpoint)
   */
  async getPositions(userId: string): Promise<any[]> {
    const dbPositions = await this.prisma.position.findMany({
      where: { userId, quantity: { not: 0 } },
      orderBy: { updatedAt: 'desc' },
    });

    if (dbPositions.length === 0) return [];

    const enriched = await Promise.all(
      dbPositions.map(async (p) => {
        let currentPrice = p.avgPrice;

        if (this.marketDataService) {
          try {
            currentPrice = await this.marketDataService.getPrice(p.symbol);
          } catch (e: any) {
            this.logger.warn(`Market price fetch failed for ${p.symbol}, using avgPrice: ${e.message}`);
          }
        }

        const unrealizedPnl = parseFloat((p.quantity * (currentPrice - p.avgPrice)).toFixed(2));

        // Persist updated unrealized PnL if changed significantly
        if (Math.abs(unrealizedPnl - (p.unrealizedPnl || 0)) > 0.5) {
          await this.prisma.position
            .update({
              where: { id: p.id },
              data: { unrealizedPnl },
            })
            .catch((err) => this.logger.warn('Failed to persist unrealizedPnL update', err?.message));
        }

        return {
          id: p.id,
          symbol: p.symbol,
          quantity: p.quantity,
          avgPrice: p.avgPrice,
          currentPrice: parseFloat(currentPrice.toFixed(2)),
          unrealizedPnl,
          realizedPnl: p.realizedPnl || 0,
          side: p.quantity > 0 ? 'LONG' : 'SHORT',
          exchangeAccountId: p.exchangeAccountId,
        };
      }),
    );

    return enriched;
  }

  /**
   * Alias for controller compatibility
   */
  async getPaperPositionsWithLivePnL(userId: string) {
    return this.getPositions(userId);
  }

  /**
   * Get summary PnL for paper account
   */
  async getPaperPnLSummary(userId: string) {
    const positions = await this.getPositions(userId);
    const totalUnrealized = positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);
    const totalRealized = positions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
    const totalValue = positions.reduce(
      (sum, p) => sum + Math.abs(p.quantity || 0) * (p.currentPrice || p.avgPrice || 0),
      0,
    );

    return {
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalUnrealizedPnl: parseFloat(totalUnrealized.toFixed(2)),
      totalRealizedPnl: parseFloat(totalRealized.toFixed(2)),
      positionCount: positions.length,
    };
  }

  /**
   * Reset paper trading account (for testing/demo)
   */
  async resetPaperAccount(exchangeAccountId: string, initialBalance = 10000): Promise<void> {
    await this.prisma.exchangeAccount.update({
      where: { id: exchangeAccountId },
      data: { paperVirtualBalance: initialBalance },
    });

    await this.prisma.position.updateMany({
      where: { exchangeAccountId },
      data: { quantity: 0, avgPrice: 0, unrealizedPnl: 0, realizedPnl: 0 },
    });

    this.logger.log(`Reset paper account ${exchangeAccountId} to balance ${initialBalance}`);
  }
}