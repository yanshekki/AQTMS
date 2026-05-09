import { Injectable } from '@nestjs/common';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { ExchangeAccountRepository } from '../infrastructure/persistence/ExchangeAccountRepository';
import { ExchangePositionProvider } from '../exchange/interfaces/exchange-position.provider';

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
    private readonly positionProvider?: ExchangePositionProvider,
  ) {}

  async getPortfolioSummary(userId: string) {
    const positions = await this.getPositions(userId);

    const totalValue = positions.reduce((sum, p) => sum + Math.abs(p.quantity) * p.currentPrice, 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const riskExposure = totalValue > 0 ? Math.min((totalValue / 50000) * 100, 100) : 0;

    // 檢查風險警示
    const alerts: Alert[] = this.checkRiskAlerts(positions, totalValue, totalUnrealizedPnl);

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

    // 1. 整體未實現虧損超過 5%
    if (totalValue > 0 && totalUnrealizedPnl < 0) {
      const lossPercent = Math.abs(totalUnrealizedPnl) / totalValue;
      if (lossPercent > 0.05) {
        alerts.push({
          type: 'PORTFOLIO_LOSS',
          severity: lossPercent > 0.1 ? 'danger' : 'warning',
          message: `整體未實現虧損已達 ${(lossPercent * 100).toFixed(1)}%`,
        });
      }
    }

    // 2. 單一持倉未實現虧損超過 10%
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
    // ... (保留之前實作的聚合邏輯)
    const allPositions: any[] = [];
    // ... existing code for fetching positions ...
    return allPositions;
  }
}
