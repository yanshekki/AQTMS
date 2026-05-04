// ── Trade Execute Queue ──

import Queue from 'bee-queue';
import redis from '../../shared/redis';
import { logger } from '../../shared/logger';
import { QUEUE_NAMES, type TradeExecuteJob } from '../jobs';
import type { ExecuteTradeUseCase } from '../../application/use-cases/ExecuteTradeUseCase';

let tradeQueue: Queue | null = null;
let tradeUseCase: ExecuteTradeUseCase | null = null;

export function initTradeQueue(useCase: ExecuteTradeUseCase): Queue {
  tradeUseCase = useCase;

  tradeQueue = new Queue(QUEUE_NAMES.TRADE_EXECUTE, {
    redis: redis as Queue['settings']['redis'],
    removeOnSuccess: true,
    removeOnFailure: false,
  });

  tradeQueue.process(3, async (job: { data: TradeExecuteJob }) => {
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
  });

  tradeQueue.on('failed', (job: { id: string }, err: Error) => {
    logger.error({ jobId: job.id, err }, 'Trade permanently failed — manual review required');
  });

  tradeQueue.on('ready', () => logger.info('💹 Trade execute queue ready'));
  tradeQueue.on('error', (err: Error) => logger.error({ err }, 'Trade queue error'));

  return tradeQueue;
}

export function getTradeQueue(): Queue | null {
  return tradeQueue;
}

export async function getTradeQueueHealth(): Promise<{ waiting: number; active: number; failed: number }> {
  if (!tradeQueue) return { waiting: 0, active: 0, failed: 0 };
  const health = await tradeQueue.checkHealth();
  return {
    waiting: health.waiting ?? 0,
    active: health.active ?? 0,
    failed: health.failed ?? 0,
  };
}

export async function enqueueTrade(job: TradeExecuteJob): Promise<string> {
  if (!tradeQueue) throw new Error('Trade queue not initialized');
  const saved = await tradeQueue.createJob(job).retries(3).save();
  return saved.id;
}
