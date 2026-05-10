// ── News Process Queue (BullMQ Migration) ──
// Receives raw news events, runs through AI scoring pipeline.
// Converted from bee-queue to bullmq for unified architecture

import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../../shared/logger';
import { QUEUE_NAMES, type NewsProcessJob } from '../jobs';
import type { ScoringEngine } from '../../application/services/ScoringEngine';
import type { ProcessNewsUseCase } from '../../application/use-cases/ProcessNewsUseCase';
import { enqueueTrade } from './trade.processor';
import { prisma } from '../../shared/prisma';
import { PositionSizingCalculator } from '../../application/services/PositionSizingCalculator';
import { RiskEngine } from '../../application/services/RiskEngine';

// using shared prisma singleton
const riskEngine = new RiskEngine();
const sizingCalculator = new PositionSizingCalculator(riskEngine);

// ── Price Feed ──
// Fetches current price from Binance public API (no auth required).
// Cached in-memory with 15s TTL to avoid rate limits.
const priceCache = new Map<string, { price: number; ts: number }>();
const PRICE_CACHE_TTL = 15_000; // 15 seconds

async function fetchCurrentPrice(symbol: string): Promise<number> {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.ts < PRICE_CACHE_TTL) {
    return cached.price;
  }

  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    const data = (await res.json()) as { price: string };
    const price = parseFloat(data.price);
    if (!isNaN(price) && price > 0) {
      priceCache.set(symbol, { price, ts: Date.now() });
      return price;
    }
  } catch (err) {
    logger.warn({ err, symbol }, 'Failed to fetch current price from Binance');
  }

  return 0; // caller must handle zero
}

let newsQueue: Queue | null = null;
let newsWorker: Worker | null = null;
let processNewsUseCase: ProcessNewsUseCase | null = null;

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export function initNewsQueue(_engine: ScoringEngine, useCase: ProcessNewsUseCase): Queue {
  processNewsUseCase = useCase;

  newsQueue = new Queue(QUEUE_NAMES.NEWS_PROCESS, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  newsWorker = new Worker(
    QUEUE_NAMES.NEWS_PROCESS,
    async (job: Job<NewsProcessJob>) => {
      const { newsId, content, retryCount } = job.data;
      logger.info({ newsId, retryCount }, 'Processing news job');

      try {
        const result = await processNewsUseCase!.execute({
          id: newsId,
          source: job.data.source as 'TELEGRAM' | 'X' | 'ONCHAIN',
          sourceId: job.data.sourceId,
          content,
          language: 'auto',
          timestamp: new Date(),
          ...(job.data.channelName ? { channelName: job.data.channelName } : {}),
        });

        if (!result.saved) {
          logger.info({ newsId }, 'News already processed (dedup)');
        }

        // If trade is triggered, enqueue a trade job on the first connected exchange
        if (result.tradeTriggered && result.score) {
          const firstAccount = await prisma.exchangeAccount.findFirst({
            where: { status: 'CONNECTED' },
            orderBy: { createdAt: 'asc' },
          });
          if (firstAccount) {
            const symbol = result.score.affectedAssets[0] ?? 'BTCUSDT';

            // Fetch current price from public exchange API
            const currentPrice = await fetchCurrentPrice(symbol);
            if (currentPrice <= 0) {
              logger.warn({ newsId, symbol }, 'Skipping trade — unable to fetch current price');
              return;
            }

            // TODO: Replace with real exchange balance lookup (requires adapter integration)
            // For MVP, use a conservative default ($10,000). Production MUST use real balance.
            const accountSize = 10_000;

            // Calculate position size using Half Kelly
            const sizing = sizingCalculator.calculate({
              method: 'KELLY_HALF',
              accountSize,
              riskPercent: 2,
              winRate: 0.55,
              avgWin: 200,
              avgLoss: 100,
              currentPrice,
            });

            await enqueueTrade({
              symbol,
              side: result.score.suggestedAction === 'SELL' ? 'SELL' : 'BUY',
              action: result.score.suggestedAction === 'SELL' ? 'SELL' : 'BUY',
              quantity: sizing.suggestedSize > 0 ? sizing.suggestedSize : 0.001,
              reason: `AI Signal ${result.score.compositeScore}/100: ${result.score.verdict} (${sizing.method})`,
              compositeScore: result.score.compositeScore,
              exchangeAccountId: firstAccount.id,
              idempotencyKey: `${newsId}-${Date.now()}`,
              userId: firstAccount.userId,
            });
            logger.info({ newsId, score: result.score.compositeScore, symbol: result.score.affectedAssets[0] }, 'Trade enqueued from news signal');
          } else {
            logger.warn({ newsId, score: result.score.compositeScore }, 'Trade signal generated but no exchange connected');
          }
        }

        return { success: true, score: result.score?.compositeScore ?? 0, tradeTriggered: result.tradeTriggered };
      } catch (err) {
        logger.error({ err, newsId }, 'News processing job failed');
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  newsWorker.on('failed', async (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, newsId: job?.data?.newsId, retries: job?.data?.retryCount, err }, 'News job permanently failed');
  });

  newsWorker.on('ready', () => logger.info('📰 News process queue ready'));
  newsWorker.on('error', (err: Error) => logger.error({ err }, 'News process queue error'));

  if (newsQueue) {
    newsQueue.on('error', (err: Error) => logger.error({ err }, 'News process queue error'));
  }

  return newsQueue;
}

export function getNewsQueue(): Queue | null {
  return newsQueue;
}

export async function getNewsQueueHealth(): Promise<{
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
}> {
  if (!newsQueue) return { waiting: 0, active: 0, failed: 0, delayed: 0 };
  const counts = await newsQueue.getJobCounts();
  return {
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    failed: counts.failed ?? 0,
    delayed: counts.delayed ?? 0,
  };
}

export async function enqueueNews(job: NewsProcessJob): Promise<{ id: string }> {
  if (!newsQueue) throw new Error('News queue not initialized');
  const jobResult = await newsQueue.add('process', job, { attempts: 3 });
  return { id: jobResult.id };
}
