import { Injectable, Optional, Inject } from '@nestjs/common';
import { DailyPnLService } from '../portfolio/daily-pnl.service';

@Injectable()
export class KillSwitchService {
  private isKilled = false;
  private killReason: string | null = null;
  private dailyLossLimit: number;

  constructor(
    @Optional() @Inject(DailyPnLService)
    private readonly dailyPnLService?: DailyPnLService,
  ) {
    this.dailyLossLimit = Number(process.env.DAILY_LOSS_LIMIT) || 500;
  }

  async updateDailyPnl(pnl: number, userId: string = 'default') {
    // 持久化到資料庫
    if (this.dailyPnLService) {
      await this.dailyPnLService.updateDailyPnL(userId, pnl);
    }

    // 檢查是否觸發熔斷
    if (pnl <= -this.dailyLossLimit && !this.isKilled) {
      this.triggerKillSwitch(`Daily loss limit reached: $${Math.abs(pnl)}`);
    }
  }

  async isTradingAllowed(userId: string = 'default'): Promise<{ allowed: boolean; reason?: string }> {
    if (this.isKilled) {
      return {
        allowed: false,
        reason: this.killReason || 'Kill switch is active',
      };
    }

    if (this.dailyPnLService) {
      const todayPnl = await this.dailyPnLService.getTodayPnL(userId);
      if (todayPnl <= -this.dailyLossLimit) {
        return {
          allowed: false,
          reason: `Daily loss limit reached ($${Math.abs(todayPnl)})`,
        };
      }
    }

    return { allowed: true };
  }

  triggerKillSwitch(reason: string) {
    this.isKilled = true;
    this.killReason = reason;
    console.warn(`[KillSwitch] TRIGGERED: ${reason}`);
  }

  resetKillSwitch() {
    this.isKilled = false;
    this.killReason = null;
    console.log('[KillSwitch] Manually reset');
  }

  getStatus() {
    return {
      isKilled: this.isKilled,
      killReason: this.killReason,
      dailyLossLimit: this.dailyLossLimit,
    };
  }
}
