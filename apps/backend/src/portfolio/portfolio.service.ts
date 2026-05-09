import { Injectable, Optional, Inject } from '@nestjs/common';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { ExchangeAccountRepository } from '../infrastructure/persistence/ExchangeAccountRepository';
import { ExchangePositionProvider } from '../exchange/interfaces/exchange-position.provider';
import { NotificationService } from '../notification/notification.service';
import { KillSwitchService } from '../safety/kill-switch.service';

// ... existing interfaces (Alert, etc.)

@Injectable()
export class PortfolioService {
  constructor(
    private readonly paperTradingService: PaperTradingService,
    private readonly exchangeAccountRepo: ExchangeAccountRepository,
    @Optional() @Inject('EXCHANGE_POSITION_PROVIDER')
    private readonly positionProvider?: ExchangePositionProvider,
    private readonly notificationService?: NotificationService,
    private readonly killSwitchService?: KillSwitchService,
  ) {}

  async getPortfolioSummary(userId: string, telegramChatId?: string | number) {
    const positions = await this.getPositions(userId);

    const totalValue = positions.reduce((sum, p) => sum + Math.abs(p.quantity) * p.currentPrice, 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

    // 推送每日 PnL 給 Kill Switch（簡化版：使用未實現盈虧）
    if (this.killSwitchService) {
      this.killSwitchService.updateDailyPnl(totalUnrealizedPnl);
    }

    const riskExposure = totalValue > 0 ? Math.min((totalValue / 50000) * 100, 100) : 0;
    const alerts = this.checkRiskAlerts(positions, totalValue, totalUnrealizedPnl);

    // danger alerts 發送通知
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

  // ... existing getPositions() and checkRiskAlerts() methods
}
