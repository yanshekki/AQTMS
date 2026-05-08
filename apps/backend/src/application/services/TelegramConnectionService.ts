// ── Telegram Connection Service (using native fetch) ──

export class TelegramConnectionService {
  async validateBotToken(botToken: string): Promise<{ valid: boolean; error?: string; errorCode?: string }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
        method: 'GET',
      });

      const data = await response.json();

      if (data?.ok) {
        return { valid: true };
      }

      return {
        valid: false,
        error: 'Bot Token 無效或已過期',
        errorCode: 'INVALID_BOT_TOKEN',
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || '無法驗證 Telegram Bot Token',
        errorCode: 'TELEGRAM_VALIDATION_FAILED',
      };
    }
  }

  async testChannelAccess(botToken: string, channelUsername: string): Promise<{ accessible: boolean; error?: string; errorCode?: string }> {
    try {
      const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`,
        { method: 'GET' }
      );

      const data = await response.json();

      if (data?.ok) {
        return { accessible: true };
      }

      return {
        accessible: false,
        error: '無法訪問該 Channel，請確認 Bot 已加入並擁有權限',
        errorCode: 'CHANNEL_ACCESS_DENIED',
      };
    } catch (error: any) {
      const message = error.message || '';

      if (message.includes('chat not found')) {
        return {
          accessible: false,
          error: '找不到該 Channel，請確認 Channel Username 是否正確',
          errorCode: 'CHANNEL_NOT_FOUND',
        };
      }

      if (message.includes('bot is not a member')) {
        return {
          accessible: false,
          error: 'Bot 尚未加入該 Channel，請先將 Bot 加入頻道',
          errorCode: 'BOT_NOT_IN_CHANNEL',
        };
      }

      return {
        accessible: false,
        error: message || '無法訪問 Telegram Channel',
        errorCode: 'CHANNEL_ACCESS_FAILED',
      };
    }
  }
}
