// ── Queue Job Definitions ──

export const QUEUE_NAMES = {
  NEWS_PROCESS: 'news:process',
  AI_SCORING: 'ai:scoring',
  TRADE_EXECUTE: 'trade:execute',
} as const;

export interface NewsProcessJob {
  newsId: string;
  source: string;
  sourceId: string;
  content: string;
  channelName?: string;
  retryCount: number;
}

export interface AIScoringJob {
  newsId: string;
  task: 'verify' | 'score' | 'decide';
  content: string;
  context?: string;
  provider?: string; // Specific provider to use
}

export interface TradeExecuteJob {
  symbol: string;
  side: 'BUY' | 'SELL';
  action: 'BUY' | 'SELL';
  quantity: number;
  reason: string;
  compositeScore: number;
  exchangeAccountId: string;
  idempotencyKey: string;
}
