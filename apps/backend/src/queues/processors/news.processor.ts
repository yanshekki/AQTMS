// ── News Process Queue ──
// Receives raw news events, runs through AI scoring pipeline.

import Queue from 'bee-queue';
import redis from '../../shared/redis';
import { logger } from '../../shared/logger';
import { QUEUE_NAMES, type NewsProcessJob } from '../jobs';
import type { ScoringEngine } from '../../application/services/ScoringEngine';
import type { ProcessNewsUseCase } from '../../application/use-cases/ProcessNewsUseCase';
import { enqueueTrade } from './trade.processor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let newsQueue: Queue | null = null;
let processNewsUseCase: ProcessNewsUseCase | null = null;

export function initNewsQueue(_engine: ScoringEngine, useCase: ProcessNewsUseCase): Queue {
  processNewsUseCase = useCase;

  newsQueue = new Queue(QUEUE_NAMES.NEWS_PROCESS, {
    redis: redis as Queue['settings']['redis'],
    removeOnSuccess: true,
    removeOnFailure: false,
    activateDelayedJobs: true,
  });

  newsQueue.process(5, async (job: { data: NewsProcessJob }) => {
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
          await enqueueTrade({
            symbol: result.score.affectedAssets[0] ?? 'BTCUSDT',
            side: result.score.suggestedAction === 'SELL' ? 'SELL' : 'BUY',
            action: result.score.suggestedAction === 'SELL' ? 'SELL' : 'BUY',
            quantity: 0.001,
            reason: `AI Signal ${result.score.compositeScore}/100: ${result.score.verdict}`,
            compositeScore: result.score.compositeScore,
            exchangeAccountId: firstAccount.id,
            idempotencyKey: `${newsId}-${Date.now()}`,
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
  });

  newsQueue.on('failed', async (job: { id: string; data: NewsProcessJob }, err: Error) => {
    logger.error({ jobId: job.id, newsId: job.data.newsId, retries: job.data.retryCount, err }, 'News job permanently failed');
  });

  newsQueue.on('ready', () => logger.info('📰 News process queue ready'));
  newsQueue.on('error', (err: Error) => logger.error({ err }, 'News process queue error'));

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
  const health = await newsQueue.checkHealth();
  return {
    waiting: health.waiting ?? 0,
    active: health.active ?? 0,
    failed: health.failed ?? 0,
    delayed: health.delayed ?? 0,
  };
}

export async function enqueueNews(job: NewsProcessJob): Promise<{ id: string }> {
  if (!newsQueue) throw new Error('News queue not initialized');
  const jobResult = await newsQueue.createJob(job).setId(job.newsId).retries(3).save();
  return { id: jobResult.id };
}
