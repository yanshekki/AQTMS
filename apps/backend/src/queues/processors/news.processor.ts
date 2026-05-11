// ── News Process Queue (BullMQ modern pattern - WorkerHost) ──

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { QUEUE_NAMES, type NewsProcessJob } from '../jobs';
import { InjectQueue } from '@nestjs/bullmq';

@Processor(QUEUE_NAMES.NEWS_PROCESS)
@Injectable()
export class NewsProcessor extends WorkerHost {
  private readonly logger = new Logger(NewsProcessor.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.TRADE_EXECUTE) private readonly tradeQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<NewsProcessJob>) {
    const { newsId, content, retryCount = 0, source, sourceId, channelName } = job.data;
    this.logger.log(`Processing news job ${newsId} (retry: ${retryCount}) from ${source || 'unknown'}`);

    try {
      // Demo simulation (replace with real UseCase when ready)
      const simulatedResult = {
        saved: true,
        score: {
          compositeScore: 82,
          suggestedAction: 'BUY' as const,
          affectedAssets: ['BTCUSDT'],
          verdict: 'POSITIVE',
        },
        tradeTriggered: true,
      };

      if (!simulatedResult.saved) {
        this.logger.log(`News already processed (dedup) ${newsId}`);
        return { success: true, dedup: true };
      }

      if (simulatedResult.tradeTriggered && simulatedResult.score) {
        const symbol = simulatedResult.score.affectedAssets?.[0] ?? 'BTCUSDT';
        const currentPrice = 65000;

        const accountSize = 10000;
        const riskPercent = 0.01;
        const suggestedSize = Math.max(0.001, (accountSize * riskPercent) / currentPrice);

        const tradeJob = {
          symbol,
          side: (simulatedResult.score.suggestedAction as string) === 'SELL' ? 'SELL' : 'BUY',
          action: (simulatedResult.score.suggestedAction as string) === 'SELL' ? 'SELL' : 'BUY',
          quantity: suggestedSize,
          reason: `AI Signal ${simulatedResult.score.compositeScore}/100: ${simulatedResult.score.verdict} from news ${newsId}`,
          compositeScore: simulatedResult.score.compositeScore,
          exchangeAccountId: 'demo-account',
          idempotencyKey: `${newsId}-${Date.now()}`,
          userId: 'demo-user',
        };

        await this.tradeQueue.add('execute', tradeJob, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        });

        this.logger.log(`Trade enqueued from news ${newsId}`);
      }

      return {
        success: true,
        newsId,
        score: simulatedResult.score?.compositeScore ?? 0,
        tradeTriggered: simulatedResult.tradeTriggered,
      };
    } catch (err: any) {
      this.logger.error(`News processing failed for ${newsId}`, err.stack);
      throw err;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`News job ${job.id} failed: ${error.message}`);
  }
}

// Legacy enqueueNews stub — bridged to BullMQ in future hardening
export async function enqueueNews(data: any): Promise<void> {
  // TODO: inject Queue via DI and add job
  console.log('[news.processor] enqueueNews called — queue injection pending:', data.newsId);
}
