// ── Trade Execute Queue (BullMQ Migration) ──
// Converted from bee-queue to bullmq for unified architecture

import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../../shared/logger';
import { QUEUE_NAMES, type TradeExecuteJob } from '../jobs';
import type { ExecuteTradeUseCase } from '../../application/use-cases/ExecuteTradeUseCase';

let tradeQueue: Queue | null = null;
let tradeWorker: Worker | null = null;
let tradeUseCase: ExecuteTradeUseCase | null = null;

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export function initTradeQueue(useCase: ExecuteTradeUseCase): Queue {
  tradeUseCase = useCase;

  tradeQueue = new Queue(QUEUE_NAMES.TRADE_EXECUTE, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  tradeWorker = new Worker(
    QUEUE_NAMES.TRADE_EXECUTE,
    async (job: Job<TradeExecuteJob>) => {
      const { symbol, side, quantity, reason, compositeScore, exchangeAccountId, idempotencyKey, userId } = job.data;
      logger.info({ symbol, side, quantity, reason, score: compositeScore }, 'Executing trade');

      if (compositeScore < 80) {
        logger.info({ symbol, score: compositeScore }, 'Trade skipped — score below threshold');
        return { success: false, reason: 'Score below threshold', skipped: true };
      }

      const result = await tradeUseCase!.execute({
        exchangeAccountId,
        symbol,
        side,
        type: 'MARKET',
        quantity,
        timeInForce: 'GTC',
        idempotencyKey,
      }, userId);

      logger.info({ symbol, tradeId: result.id, status: result.status }, 'Trade executed');
      return { success: true, tradeId: result.id, status: result.status };
    },
    {
      connection: redisConnection,
      concurrency: 3,
    },
  );

  tradeWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err }, 'Trade permanently failed — manual review required');
  });

  tradeWorker.on('ready', () => logger.info('💹 Trade execute queue ready'));
  tradeWorker.on('error', (err: Error) => logger.error({ err }, 'Trade queue error'));

  if (tradeQueue) {
    tradeQueue.on('error', (err: Error) => logger.error({ err }, 'Trade queue error'));
  }

  return tradeQueue;
}

export function getTradeQueue(): Queue | null {
  return tradeQueue;
}

export async function getTradeQueueHealth(): Promise<{ waiting: number; active: number; failed: number }> {
  if (!tradeQueue) return { waiting: 0, active: 0, failed: 0 };
  const counts = await tradeQueue.getJobCounts();
  return {
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    failed: counts.failed ?? 0,
  };
}

export async function enqueueTrade(job: TradeExecuteJob): Promise<string> {
  if (!tradeQueue) throw new Error('Trade queue not initialized');
  const saved = await tradeQueue.add('execute', job, { attempts: 3 });
  return saved.id;
}
