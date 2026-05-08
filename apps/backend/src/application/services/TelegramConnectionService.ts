// ── Telegram Connection Service ──
// 負責驗證 Telegram Bot Token 並測試連接

import axios from 'axios';

export class TelegramConnectionService {
  async validateBotToken(botToken: string): Promise<{ valid: boolean; botInfo?: any; error?: string }> {
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${botToken}/getMe`,
        { timeout: 8000 }
      );

      if (response.data?.ok) {
        return {
          valid: true,
          botInfo: response.data.result,
        };
      }

      return {
        valid: false,
        error: 'Invalid bot token',
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.description || 'Failed to validate Telegram bot token',
      };
    }
  }

  async testChannelAccess(botToken: string, channelUsername: string): Promise<{ accessible: boolean; error?: string }> {
    try {
      // 簡單測試：嘗試獲取 chat 資訊
      const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;

      const response = await axios.get(
        `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`,
        { timeout: 8000 }
      );

      return {
        accessible: response.data?.ok === true,
      };
    } catch (error: any) {
      return {
        accessible: false,
        error: error.response?.data?.description || 'Cannot access channel',
      };
    }
  }
}
