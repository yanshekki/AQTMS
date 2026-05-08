// ── Telegram Connection Service (Improved Error Messages) ──

import axios from 'axios';

export class TelegramConnectionService {
  async validateBotToken(botToken: string): Promise<{ valid: boolean; error?: string; errorCode?: string }> {
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${botToken}/getMe`,
        { timeout: 8000 }
      );

      if (response.data?.ok) {
        return { valid: true };
      }

      return {
        valid: false,
        error: 'Bot Token 無效或已過期',
        errorCode: 'INVALID_BOT_TOKEN',
      };
    } catch (error: any) {
      const status = error.response?.status;
      const description = error.response?.data?.description || '';

      if (status === 401) {
        return {
          valid: false,
          error: 'Bot Token 不正確，請檢查是否輸入錯誤',
          errorCode: 'INVALID_BOT_TOKEN',
        };
      }

      if (description.includes('bot was blocked')) {
        return {
          valid: false,
          error: 'Bot 已被用戶封鎖，請解除封鎖後再試',
          errorCode: 'BOT_BLOCKED',
        };
      }

      return {
        valid: false,
        error: description || '無法驗證 Telegram Bot Token',
        errorCode: 'TELEGRAM_VALIDATION_FAILED',
      };
    }
  }

  async testChannelAccess(botToken: string, channelUsername: string): Promise<{ accessible: boolean; error?: string; errorCode?: string }> {
    try {
      const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;

      const response = await axios.get(
        `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`,
        { timeout: 8000 }
      );

      if (response.data?.ok) {
        return { accessible: true };
      }

      return {
        accessible: false,
        error: '無法訪問該 Channel，請確認 Bot 已加入並擁有權限',
        errorCode: 'CHANNEL_ACCESS_DENIED',
      };
    } catch (error: any) {
      const description = error.response?.data?.description || '';

      if (description.includes('chat not found')) {
        return {
          accessible: false,
          error: '找不到該 Channel，請確認 Channel Username 是否正確',
          errorCode: 'CHANNEL_NOT_FOUND',
        };
      }

      if (description.includes('bot is not a member')) {
        return {
          accessible: false,
          error: 'Bot 尚未加入該 Channel，請先將 Bot 加入頻道',
          errorCode: 'BOT_NOT_IN_CHANNEL',
        };
      }

      return {
        accessible: false,
        error: description || '無法訪問 Telegram Channel',
        errorCode: 'CHANNEL_ACCESS_FAILED',
      };
    }
  }
}
