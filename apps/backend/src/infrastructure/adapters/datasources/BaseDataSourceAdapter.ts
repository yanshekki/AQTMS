// ── Base Data Source Adapter ──

export interface NewsItem {
  id: string;
  source: 'TELEGRAM' | 'X' | 'ONCHAIN';
  sourceId: string;
  channelName?: string;
  authorName?: string;
  content: string;
  url?: string;
  language: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export abstract class BaseDataSourceAdapter {
  public abstract readonly sourceName: string;

  abstract fetchMessages(limit?: number, since?: Date): Promise<NewsItem[]>;
  abstract startPolling(callback: (news: NewsItem) => void, intervalMs?: number): void;
  abstract stopPolling(): void;
  abstract testConnection(): Promise<boolean>;
}
