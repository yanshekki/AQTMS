// ── AI Scoring Queue ──

import Queue from 'bee-queue';
import redis from '../../shared/redis';
import { logger } from '../../shared/logger';
import { QUEUE_NAMES, type AIScoringJob } from '../jobs';
import type { AIProviderRegistry } from '../../infrastructure/ai-providers/AIProviderRegistry';

let aiQueue: Queue | null = null;
let aiRegistry: AIProviderRegistry | null = null;

export function initAIScoringQueue(registry: AIProviderRegistry): Queue {
  aiRegistry = registry;

  aiQueue = new Queue(QUEUE_NAMES.AI_SCORING, {
    redis: redis as Queue['settings']['redis'],
    removeOnSuccess: true,
    removeOnFailure: false,
  });

  aiQueue.process(10, async (job: { data: AIScoringJob }) => {
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
  });

  aiQueue.on('failed', (job: { id: string }, err: Error) => {
    logger.error({ jobId: job.id, err }, 'AI scoring job permanently failed');
  });

  aiQueue.on('ready', () => logger.info('🤖 AI scoring queue ready'));
  aiQueue.on('error', (err: Error) => logger.error({ err }, 'AI scoring queue error'));

  return aiQueue;
}

export function getAIQueue(): Queue | null {
  return aiQueue;
}

export async function getAIQueueHealth(): Promise<{ waiting: number; active: number; failed: number }> {
  if (!aiQueue) return { waiting: 0, active: 0, failed: 0 };
  const health = await aiQueue.checkHealth();
  return {
    waiting: health.waiting ?? 0,
    active: health.active ?? 0,
    failed: health.failed ?? 0,
  };
}
