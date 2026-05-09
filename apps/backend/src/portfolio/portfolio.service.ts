import { Injectable, Optional, Inject } from '@nestjs/common';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { ExchangeAccountRepository } from '../infrastructure/persistence/ExchangeAccountRepository';
import { ExchangePositionProvider } from '../exchange/interfaces/exchange-position.provider';
import { NotificationService } from '../notification/notification.service';

export interface Alert {
  type: string;
  severity: 'warning' | 'danger';
  message: string;
  symbol?: string;
}

@Injectable()
export class PortfolioService {
  constructor(
    private readonly paperTradingService: PaperTradingService,
    private readonly exchangeAccountRepo: ExchangeAccountRepository,
    @Optional() @Inject('EXCHANGE_POSITION_PROVIDER')
    private readonly positionProvider?: ExchangePositionProvider,
    private readonly notificationService?: NotificationService,
  ) {}

  async getPortfolioSummary(userId: string, telegramChatId?: string | number) {
    const positions = await this.getPositions(userId);

    const totalValue = positions.reduce((sum, p) => sum + Math.abs(p.quantity) * p.currentPrice, 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const riskExposure = totalValue > 0 ? Math.min((totalValue / 50000) * 100, 100) : 0;

    const alerts = this.checkRiskAlerts(positions, totalValue, totalUnrealizedPnl);

    // 如果有 danger 等級的警示，發送 Telegram 通知
    const dangerAlerts = alerts.filter(a => a.severity === 'danger');
    if (dangerAlerts.length > 0 && this.notificationService && telegramChatId) {
      this.notificationService.sendRiskAlert(telegramChatId, dangerAlerts);
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

  private checkRiskAlerts(positions: any[], totalValue: number, totalUnrealizedPnl: number): Alert[] {
    const alerts: Alert[] = [];

    if (totalValue > 0 && totalUnrealizedPnl < 0) {
      const lossPercent = Math.abs(totalUnrealizedPnl) / totalValue;
      if (lossPercent > 0.05) {
        alerts.push({
          type: 'PORTFOLIO_LOSS',
          severity: lossPercent > 0.10 ? 'danger' : 'warning',
          message: `整體未實現虧損已達 ${(lossPercent * 100).toFixed(1)}%`,
        });
      }
    }

    for (const pos of positions) {
      if (pos.unrealizedPnlPercent < -10) {
        alerts.push({
          type: 'POSITION_LOSS',
          severity: pos.unrealizedPnlPercent < -20 ? 'danger' : 'warning',
          message: `${pos.symbol} 未實現虧損已達 ${Math.abs(pos.unrealizedPnlPercent).toFixed(1)}%`,
          symbol: pos.symbol,
        });
      }
    }

    return alerts;
  }

  async getPositions(userId: string) {
    const allPositions: any[] = [];
    const accounts = await this.exchangeAccountRepo.findByUser(userId);

    for (const account of accounts) {
      if (account.isPaperTrading) {
        const paperPositions = this.paperTradingService.getVirtualPositions(userId);
        for (const p of paperPositions) {
          allPositions.push({ /* ... */ });
        }
      } else if (this.positionProvider) {
        try {
          const livePositions = await this.positionProvider.getPositions(userId);
          for (const p of livePositions) {
            allPositions.push({ /* ... */ });
          }
        } catch (error) {
          console.error(error);
        }
      }
    }
    return allPositions;
  }
}
