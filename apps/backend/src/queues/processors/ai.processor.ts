// ── AI Scoring Queue (BullMQ Migration) ──
// Converted from bee-queue to bullmq for unified architecture

import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../../shared/logger';
import { QUEUE_NAMES, type AIScoringJob } from '../jobs';
import type { AIProviderRegistry } from '../../infrastructure/ai-providers/AIProviderRegistry';

let aiQueue: Queue | null = null;
let aiWorker: Worker | null = null;
let aiRegistry: AIProviderRegistry | null = null;

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export function initAIScoringQueue(registry: AIProviderRegistry): Queue {
  aiRegistry = registry;

  aiQueue = new Queue(QUEUE_NAMES.AI_SCORING, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  aiWorker = new Worker(
    QUEUE_NAMES.AI_SCORING,
    async (job: Job<AIScoringJob>) => {
      const { newsId, task, content, context, provider } = job.data;
      logger.info({ newsId, task, provider }, 'AI scoring job started');

      const entry = provider
        ? aiRegistry!.get(provider)
        : aiRegistry!.getHealthy()[0];

      if (!entry || !entry.isHealthy) {
        throw new Error(`No healthy AI provider available for task: ${task}`);
      }

      let result: unknown;
      switch (task) {
        case 'verify':
          result = await entry.provider.verifyTruth(content);
          break;
        case 'score':
          result = await entry.provider.scoreNews(content, context);
          break;
        case 'decide':
          result = await entry.provider.makeDecision(context ?? content);
          break;
        default:
          throw new Error(`Unknown AI task: ${task}`);
      }

      return { success: true, task, provider: entry.type, result };
    },
    {
      connection: redisConnection,
      concurrency: 10,
    },
  );

  aiWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err }, 'AI scoring job permanently failed');
  });

  aiWorker.on('ready', () => logger.info('🤖 AI scoring queue ready'));
  aiWorker.on('error', (err: Error) => logger.error({ err }, 'AI scoring queue error'));

  if (aiQueue) {
    aiQueue.on('error', (err: Error) => logger.error({ err }, 'AI scoring queue error'));
  }

  return aiQueue;
}

export function getAIQueue(): Queue | null {
  return aiQueue;
}

export async function getAIQueueHealth(): Promise<{ waiting: number; active: number; failed: number }> {
  if (!aiQueue) return { waiting: 0, active: 0, failed: 0 };
  const counts = await aiQueue.getJobCounts();
  return {
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    failed: counts.failed ?? 0,
  };
}
