import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NotificationService {
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;

  /**
   * 發送 Telegram 訊息
   */
  async sendTelegramMessage(chatId: string | number, message: string): Promise<boolean> {
    if (!this.botToken) {
      console.warn('[NotificationService] TELEGRAM_BOT_TOKEN 未設定，無法發送 Telegram');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      });
      console.log(`[NotificationService] Telegram 訊息已發送至 ${chatId}`);
      return true;
    } catch (error) {
      console.error('[NotificationService] 發送 Telegram 失敗:', error);
      return false;
    }
  }

  /**
   * 發送風險警示通知
   */
  async sendRiskAlert(chatId: string | number, alerts: any[]): Promise<void> {
    if (!alerts || alerts.length === 0) return;

    const messageLines = alerts.map(alert => {
      const icon = alert.severity === 'danger' ? '🚨' : '⚠️';
      return `${icon} <b>${alert.message}</b>`;
    });

    const fullMessage = [
      '📊 <b>AQTMS 風險警示</b>',
      '',
      ...messageLines,
      '',
      '請及時檢視您的 Portfolio Dashboard。',
    ].join('
');

    await this.sendTelegramMessage(chatId, fullMessage);
  }
}
