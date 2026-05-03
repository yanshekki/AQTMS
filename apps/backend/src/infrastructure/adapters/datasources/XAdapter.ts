// ── X.com (Twitter) Data Source Adapter ──
// Fetches tweets from specified accounts using X API v2.

import { BaseDataSourceAdapter, type NewsItem } from './BaseDataSourceAdapter';
import { logger } from '../../../shared/logger';

export interface XAdapterConfig {
  bearerToken: string;
  usernames: string[]; // e.g., ['elonmusk', 'cz_binance']
  limit?: number;
}

export class XAdapter extends BaseDataSourceAdapter {
  public readonly sourceName = 'X';
  private readonly bearerToken: string;
  private readonly usernames: string[];
  private readonly limit: number;
  private pollingTimer?: ReturnType<typeof setInterval> | undefined;

  constructor(config: XAdapterConfig) {
    super();
    this.bearerToken = config.bearerToken;
    this.usernames = config.usernames;
    this.limit = config.limit ?? 20;
  }

  async fetchMessages(limit = this.limit, since?: Date): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];

    for (const username of this.usernames) {
      try {
        const tweets = await this.fetchUserTweets(username, limit, since);
        allNews.push(...tweets);
      } catch (error) {
        logger.warn({ username, error }, 'Failed to fetch X tweets');
      }
    }

    return allNews.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  startPolling(callback: (news: NewsItem) => void, intervalMs = 60_000): void {
    logger.info(`X polling started (${this.usernames.length} users, ${intervalMs}ms interval)`);

    this.pollingTimer = setInterval(async () => {
      try {
        const news = await this.fetchMessages(5, new Date(Date.now() - intervalMs * 2));
        for (const item of news) {
          callback(item);
        }
      } catch (error) {
        logger.warn({ error }, 'X polling error');
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
      logger.info('X polling stopped');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${this.bearerToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ── Private ──

  private async fetchUserTweets(username: string, limit: number, since?: Date): Promise<NewsItem[]> {
    // First, get user ID from username
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}`,
      { headers: { Authorization: `Bearer ${this.bearerToken}` } },
    );

    if (!userResponse.ok) {
      throw new Error(`X API user lookup failed: ${userResponse.status}`);
    }

    const userData = (await userResponse.json()) as {
      data?: { id: string; name: string; username: string };
    };

    if (!userData.data?.id) {
      throw new Error(`User not found: ${username}`);
    }

    // Fetch recent tweets
    const startTime = since ? `&start_time=${since.toISOString()}` : '';
    const tweetsResponse = await fetch(
      `https://api.twitter.com/2/users/${userData.data.id}/tweets?max_results=${limit}${startTime}&tweet.fields=created_at,entities`,
      { headers: { Authorization: `Bearer ${this.bearerToken}` } },
    );

    if (!tweetsResponse.ok) {
      throw new Error(`X API tweets failed: ${tweetsResponse.status}`);
    }

    const tweetsData = (await tweetsResponse.json()) as {
      data?: Array<{ id: string; text: string; created_at: string }>;
    };

    if (!tweetsData.data) return [];

    return tweetsData.data.map((t) => ({
      id: `x_${t.id}`,
      source: 'X' as const,
      sourceId: t.id,
      authorName: userData.data!.name,
      channelName: `@${username}`,
      content: t.text,
      url: `https://x.com/${username}/status/${t.id}`,
      language: 'auto',
      timestamp: new Date(t.created_at),
    }));
  }
}
