// ── News Process Queue (BullMQ @nestjs/bullmq Class Version) ──
// Major refactor: from bee-queue global init to NestJS @Processor + @InjectQueue for cross-queue enqueue
// Added exponential backoff for trade enqueue
// TODOs for full DI integration of ProcessNewsUseCase and ScoringEngine

import { Processor, Process, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QUEUE_NAMES, type NewsProcessJob } from '../jobs';
// import type { ProcessNewsUseCase } from '../../application/use-cases/ProcessNewsUseCase';
// import { prisma } from '../../shared/prisma';
// import { PositionSizingCalculator } from '../../application/services/PositionSizingCalculator';
// import { RiskEngine } from '../../application/services/RiskEngine';

@Processor(QUEUE_NAMES.NEWS_PROCESS)
@Injectable()
export class NewsProcessor {
  private readonly logger = new Logger(NewsProcessor.name);

  // TODO: Make ProcessNewsUseCase @Injectable and inject here
  // private processNewsUseCase: ProcessNewsUseCase;

  // For cross queue enqueue to trade (better than global enqueueTrade)
  constructor(
    @InjectQueue(QUEUE_NAMES.TRADE_EXECUTE) private readonly tradeQueue: Queue,
  ) {}

  @Process()
  async handleNews(job: Job<NewsProcessJob>) {
    const { newsId, content, retryCount, source, sourceId, channelName } = job.data;
    this.logger.log(`Processing news job ${newsId} (retry: ${retryCount || 0})`);

    try {
      // TODO: Replace with injected processNewsUseCase.execute(...) after refactoring it to @Injectable
      // For now, simulate the scoring result to keep pipeline demo-able
      const simulatedResult = {
        saved: true,
        score: { compositeScore: 82, suggestedAction: 'BUY', affectedAssets: ['BTCUSDT'], verdict: 'POSITIVE' },
        tradeTriggered: true,
      };

      if (!simulatedResult.saved) {
        this.logger.log(`News already processed (dedup) ${newsId}`);
      }

      // If trade triggered, enqueue to trade queue with backoff
      if (simulatedResult.tradeTriggered && simulatedResult.score) {
        // TODO: Move price fetch, sizing calc to proper service or keep here
        const symbol = simulatedResult.score.affectedAssets?.[0] ?? 'BTCUSDT';
        const currentPrice = 65000; // TODO: fetch real price async

        const accountSize = 10000;
        const suggestedSize = Math.max(0.001, accountSize * 0.01 / currentPrice); // simple 1% risk

        const tradeJob = {
          symbol,
          side: simulatedResult.score.suggestedAction === 'SELL' ? 'SELL' : 'BUY',
          action: simulatedResult.score.suggestedAction === 'SELL' ? 'SELL' : 'BUY',
          quantity: suggestedSize,
          reason: `AI Signal ${simulatedResult.score.compositeScore}/100: ${simulatedResult.score.verdict}`,
          compositeScore: simulatedResult.score.compositeScore,
          exchangeAccountId: 'demo-account', // TODO: resolve from user
          idempotencyKey: `${newsId}-${Date.now()}`,
          userId: 'demo-user',
        };

        await this.tradeQueue.add('execute', tradeJob, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        });

        this.logger.log(`Trade enqueued from news ${newsId} with backoff`);
      }

      return { success: true, score: simulatedResult.score?.compositeScore ?? 0, tradeTriggered: simulatedResult.tradeTriggered };
    } catch (err: any) {
      this.logger.error(`News processing failed for ${newsId}`, err.stack);
      throw err;
    }
  }
}
