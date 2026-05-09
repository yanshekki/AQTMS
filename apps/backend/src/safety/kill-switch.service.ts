import { Injectable } from '@nestjs/common';

@Injectable()
export class KillSwitchService {
  private isKilled = false;
  private killReason: string | null = null;
  private dailyLossLimit: number; // 每日最大虧損金額（正數）
  private currentDailyPnl = 0;
  private lastResetDate: string;

  constructor() {
    this.dailyLossLimit = Number(process.env.DAILY_LOSS_LIMIT) || 500; // 預設 $500
    this.lastResetDate = this.getToday();
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private checkAndResetDaily() {
    const today = this.getToday();
    if (today !== this.lastResetDate) {
      this.currentDailyPnl = 0;
      this.lastResetDate = today;
      console.log('[KillSwitch] Daily PnL reset');
    }
  }

  /**
   * 手動觸發 Kill Switch
   */
  triggerKillSwitch(reason: string) {
    this.isKilled = true;
    this.killReason = reason;
    console.warn(`[KillSwitch] TRIGGERED: ${reason}`);
  }

  /**
   * 手動重置 Kill Switch
   */
  resetKillSwitch() {
    this.isKilled = false;
    this.killReason = null;
    console.log('[KillSwitch] Manually reset');
  }

  /**
   * 更新當日 PnL（由 Portfolio 或 Execution 呼叫）
   */
  updateDailyPnl(pnl: number) {
    this.checkAndResetDaily();
    this.currentDailyPnl = pnl;

    if (this.currentDailyPnl <= -this.dailyLossLimit && !this.isKilled) {
      this.triggerKillSwitch(`Daily loss limit reached: $${Math.abs(this.currentDailyPnl)}`);
    }
  }

  /**
   * 檢查是否允許交易
   */
  isTradingAllowed(): { allowed: boolean; reason?: string } {
    this.checkAndResetDaily();

    if (this.isKilled) {
      return {
        allowed: false,
        reason: this.killReason || 'Kill switch is active',
      };
    }

    if (this.currentDailyPnl <= -this.dailyLossLimit) {
      return {
        allowed: false,
        reason: `Daily loss limit reached ($${Math.abs(this.currentDailyPnl)})`,
      };
    }

    return { allowed: true };
  }

  getStatus() {
    return {
      isKilled: this.isKilled,
      killReason: this.killReason,
      currentDailyPnl: this.currentDailyPnl,
      dailyLossLimit: this.dailyLossLimit,
    };
  }
}
