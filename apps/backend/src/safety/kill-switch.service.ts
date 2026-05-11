import { Injectable } from '@nestjs/common';
import { MetricsService } from '../common/metrics/metrics.service';

@Injectable()
export class KillSwitchService {
  private isActive = false;
  private dailyPnl = 0;
  private dailyLossLimit = 1000;

  constructor(private readonly metricsService: MetricsService) {}

  async updateDailyPnl(pnl: number): Promise<void> {
    this.dailyPnl += pnl;
    if (this.dailyPnl <= -this.dailyLossLimit) {
      await this.activate('Daily loss limit exceeded');
    }
  }

  async isTradingAllowed(): Promise<boolean> {
    return !this.isActive;
  }

  async activate(reason: string): Promise<void> {
    this.isActive = true;
    this.metricsService.recordKillSwitchTriggered(reason);
  }

  async resetKillSwitch(): Promise<void> {
    this.isActive = false;
    this.dailyPnl = 0;
  }

  triggerKillSwitch(reason: string) {
    this.activate(reason);
  }

  async getStatus() {
    return {
      isActive: this.isActive,
      dailyPnl: this.dailyPnl,
    };
  }
}
