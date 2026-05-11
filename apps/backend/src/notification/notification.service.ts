import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendRiskAlert(userId: string, message: string, severity: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    const fullMessage = `[RISK ALERT - ${severity.toUpperCase()}] User ${userId}: ${message}`;
    this.logger.warn(fullMessage);
    // TODO: Integrate with real notification channels (Telegram, Email, etc.)
  }

  async sendTelegram(message: string, chatId?: string): Promise<boolean> {
    // existing implementation...
    this.logger.log(`[TELEGRAM] ${message}`);
    return true;
  }

  async notifyCriticalEvent(event: string, details: any, userId?: string): Promise<void> {
    // existing implementation...
  }

  async notifyKillSwitchActivated(userId: string, reason?: string): Promise<void> {
    await this.notifyCriticalEvent('KILL SWITCH ACTIVATED', { reason }, userId);
  }

  async notifyRiskBreach(userId: string, riskDetails: any): Promise<void> {
    await this.notifyCriticalEvent('RISK RULE BREACH', riskDetails, userId);
  }
}
