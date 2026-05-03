// ── Telegram Data Source Adapter ──
// Fetches messages from Telegram channels via Bot API.

import { BaseDataSourceAdapter, type NewsItem } from './BaseDataSourceAdapter';
import { logger } from '../../../shared/logger';

export interface TelegramAdapterConfig {
  botToken: string;
  channelUsernames: string[]; // e.g., ['@cointelegraph', '@whale_alert']
  limit?: number;
}

export class TelegramAdapter extends BaseDataSourceAdapter {
  public readonly sourceName = 'TELEGRAM';
  private readonly botToken: string;
  private readonly channels: string[];
  private readonly limit: number;
  private pollingTimer?: ReturnType<typeof setInterval> | undefined;
  private lastUpdateIds = new Map<string, number>();

  constructor(config: TelegramAdapterConfig) {
    super();
    this.botToken = config.botToken;
    this.channels = config.channelUsernames;
    this.limit = config.limit ?? 50;
  }

  async fetchMessages(limit = this.limit, since?: Date): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];

    for (const channel of this.channels) {
      try {
        const messages = await this.fetchChannelMessages(channel, limit);
        const filtered = since
          ? messages.filter((m) => m.timestamp > since)
          : messages;
        allNews.push(...filtered);
      } catch (error) {
        logger.warn({ channel, error }, 'Failed to fetch Telegram channel');
      }
    }

    return allNews.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  startPolling(callback: (news: NewsItem) => void, intervalMs = 30_000): void {
    logger.info(`Telegram polling started (${this.channels.length} channels, ${intervalMs}ms interval)`);

    this.pollingTimer = setInterval(async () => {
      try {
        const news = await this.fetchNewMessages();
        for (const item of news) {
          callback(item);
        }
      } catch (error) {
        logger.warn({ error }, 'Telegram polling error');
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
      logger.info('Telegram polling stopped');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
      const data = (await response.json()) as { ok: boolean };
      return data.ok === true;
    } catch {
      return false;
    }
  }

  // ── Private ──

  private async fetchChannelMessages(channel: string, limit: number): Promise<NewsItem[]> {
    const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
    // Note: For channels, we need to use getUpdates or set up a webhook
    // Channels require the bot to be an admin. This is a polling-based approach.
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset: -1,
        limit,
        timeout: 10,
        allowed_updates: ['channel_post'],
      }),
    });

    const data = (await response.json()) as {
      ok: boolean;
      result?: Array<{
        update_id: number;
        channel_post?: {
          message_id: number;
          chat: { id: number; username?: string; title?: string };
          text?: string;
          date: number;
        };
      }>;
    };

    if (!data.ok || !data.result) return [];

    return data.result
      .filter((u) => u.channel_post?.text)
      .map((u) => {
        const post = u.channel_post!;
        return {
          id: `tg_${post.message_id}`,
          source: 'TELEGRAM' as const,
          sourceId: post.message_id.toString(),
          channelName: post.chat.title ?? post.chat.username ?? channel,
          content: post.text ?? '',
          url: `https://t.me/${post.chat.username ?? channel}/${post.message_id}`,
          language: 'auto',
          timestamp: new Date(post.date * 1000),
        };
      });
  }

  private async fetchNewMessages(): Promise<NewsItem[]> {
    const news: NewsItem[] = [];
    for (const channel of this.channels) {
      const lastId = this.lastUpdateIds.get(channel) ?? 0;
      const messages = await this.fetchChannelMessages(channel, 10);
      const newMessages = messages.filter((m) => parseInt(m.sourceId) > lastId);
      if (newMessages.length > 0) {
        const maxId = Math.max(...newMessages.map((m) => parseInt(m.sourceId)));
        this.lastUpdateIds.set(channel, maxId);
        news.push(...newMessages);
      }
    }
    return news;
  }
}
