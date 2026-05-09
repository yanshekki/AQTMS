import { Injectable, Optional, Inject } from '@nestjs/common';
import { StructuredLoggerService } from '../common/logger/logger.service';

@Injectable()
export class KillSwitchService {
  private structuredLogger = new StructuredLoggerService();

  constructor() {
    this.structuredLogger.setContext('KillSwitchService');
  }

  async updateDailyPnl(pnl: number, userId: string = 'default') {
    if (pnl <= -this.dailyLossLimit && !this.isKilled) {
      this.structuredLogger.warn('Approaching daily loss limit', {
        userId,
        currentPnl: pnl,
        limit: this.dailyLossLimit,
      });
    }
  }

  triggerKillSwitch(reason: string) {
    this.isKilled = true;
    this.killReason = reason;
    this.structuredLogger.error('Kill switch triggered', { reason });
  }

  resetKillSwitch() {
    this.isKilled = false;
    this.killReason = null;
    this.structuredLogger.log('Kill switch manually reset by operator');
  }

  getStatus() {
    return {
      isKilled: this.isKilled,
      killReason: this.killReason,
      dailyLossLimit: this.dailyLossLimit,
    };
  }
}
