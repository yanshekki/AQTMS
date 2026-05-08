// ── Telegram Connection Service ──

interface TelegramGetMeResponse {
  ok: boolean;
  result?: { id: number; is_bot: boolean; first_name: string; username?: string };
  description?: string;
}

interface TelegramGetChatResponse {
  ok: boolean;
  result?: { id: number; title?: string; username?: string };
  description?: string;
}

export class TelegramConnectionService {
  async validateBotToken(botToken: string): Promise<{ valid: boolean; error?: string; errorCode?: string }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data: TelegramGetMeResponse = await response.json();

      if (data.ok) {
        return { valid: true };
      }

      return {
        valid: false,
        error: data.description || 'Bot Token 無效或已過期',
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

      const response = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
      const data: TelegramGetChatResponse = await response.json();

      if (data.ok) {
        return { accessible: true };
      }

      return {
        accessible: false,
        error: data.description || '無法訪問該 Channel，請確認 Bot 已加入並擁有權限',
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
