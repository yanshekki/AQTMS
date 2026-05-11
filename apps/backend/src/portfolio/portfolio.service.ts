import { Injectable, Optional, Inject, Logger } from '@nestjs/common';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { ExchangeAccountRepository } from '../infrastructure/persistence/ExchangeAccountRepository';
import { ExchangePositionProvider } from '../exchange/interfaces/exchange-position.provider';
import { NotificationService } from '../notification/notification.service';
import { KillSwitchService } from '../safety/kill-switch.service';
import { DailyPnLService } from './daily-pnl.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paperTradingService: PaperTradingService,
    @Optional() private readonly exchangeAccountRepo: ExchangeAccountRepository = undefined as any,
    @Optional() @Inject('EXCHANGE_POSITION_PROVIDER')
    private readonly positionProvider?: ExchangePositionProvider,
    private readonly notificationService?: NotificationService,
    private readonly killSwitchService?: KillSwitchService,
    private readonly dailyPnLService?: DailyPnLService,
  ) {}

  async getPositions(userId: string): Promise<any[]> {
    // Try live exchange position provider first (for real trading mode)
    if (this.positionProvider) {
      try {
        const livePositions = await this.positionProvider.getPositions(userId);
        if (livePositions && livePositions.length > 0) {
          return livePositions;
        }
      } catch (err: any) {
        this.logger.warn(`Live position provider failed for user ${userId}, falling back: ${err.message}`);
      }
    }

    // Fallback to paper trading positions
    try {
      if (this.paperTradingService && typeof (this.paperTradingService as any).getPositions === 'function') {
        const paperPositions = await (this.paperTradingService as any).getPositions(userId);
        if (paperPositions && paperPositions.length > 0) {
          return paperPositions;
        }
      }
    } catch (err: any) {
      this.logger.warn(`PaperTrading getPositions failed: ${err.message}`);
    }

    // Final fallback: query Prisma Position model
    try {
      const dbPositions = await this.prisma.position.findMany({
        where: { userId },
      });
      return dbPositions.map((p: any) => ({
        symbol: p.symbol,
        quantity: p.quantity,
        avgPrice: p.avgPrice,
        currentPrice: p.avgPrice, // TODO: enrich with live price from market data
        unrealizedPnl: p.unrealizedPnl,
        side: p.quantity > 0 ? 'BUY' : 'SELL',
      }));
    } catch (err: any) {
      this.logger.error(`Failed to fetch positions from DB for user ${userId}`, err.stack);
      return [];
    }
  }

  async getPortfolioSummary(userId: string, telegramChatId?: string | number) {
    const positions = await this.getPositions(userId);

    const totalValue = positions.reduce((sum, p) => sum + Math.abs(p.quantity || 0) * (p.currentPrice || p.avgPrice || 0), 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

    if (this.dailyPnLService) {
      await this.dailyPnLService.updateDailyPnL(userId, totalUnrealizedPnl);
    }

    if (this.killSwitchService) {
      await (this.killSwitchService as any).updateDailyPnl(totalUnrealizedPnl, userId);
    }

    const riskExposure = totalValue > 0 ? Math.min((totalValue / 50000) * 100, 100) : 0;
    const alerts = this.checkRiskAlerts(positions, totalValue, totalUnrealizedPnl);

    const dangerAlerts = alerts.filter(a => a.severity === 'danger');
    if (dangerAlerts.length > 0 && this.notificationService && telegramChatId) {
      (this.notificationService as any).sendRiskAlert(String(telegramChatId), dangerAlerts);
    }

    return {
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalUnrealizedPnl: parseFloat(totalUnrealizedPnl.toFixed(2)),
      totalRiskExposure: parseFloat(riskExposure.toFixed(1)),
      positionCount: positions.length,
      alerts,
      lastUpdated: new Date(),
    };
  }

  private checkRiskAlerts(positions: any[], totalValue: number, totalUnrealizedPnl: number): any[] {
    const alerts: any[] = [];
    if (totalValue > 0 && Math.abs(totalUnrealizedPnl) / totalValue > 0.1) {
      alerts.push({
        severity: 'danger',
        message: `High unrealized PnL risk: ${(Math.abs(totalUnrealizedPnl) / totalValue * 100).toFixed(1)}% of portfolio`,
        type: 'PNL_RISK',
      });
    }
    positions.forEach((pos: any) => {
      if (Math.abs(pos.unrealizedPnl || 0) > 1000) {
        alerts.push({
          severity: 'warning',
          message: `Large PnL on ${pos.symbol}: $${(pos.unrealizedPnl || 0).toFixed(2)}`,
          type: 'POSITION_RISK',
          symbol: pos.symbol,
        });
      }
    });
    return alerts;
  }

  async createSnapshot(userId: string): Promise<any> {
    const positions = await this.getPositions(userId);
    const totalValue = positions.reduce((sum, p) => sum + Math.abs(p.quantity || 0) * (p.currentPrice || p.avgPrice || 0), 0);

    const snapshot = await this.prisma.portfolioSnapshot.create({
      data: {
        userId,
        totalValue: parseFloat(totalValue.toFixed(2)),
        positions: positions as any,
      },
    });

    this.logger.log(`Created real PortfolioSnapshot ${snapshot.id} for user ${userId}`);
    return snapshot;
  }

  async getSnapshots(userId: string, limit = 20): Promise<any[]> {
    return this.prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
