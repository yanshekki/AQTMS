// ── Trade Execute Queue (BullMQ @nestjs/bullmq Class Version) ──
// Refactored to proper NestJS BullMQ Processor class with DI for better architecture
// Added backoff support in job options (configured in producer side)

import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QUEUE_NAMES, type TradeExecuteJob } from '../jobs';

@Processor(QUEUE_NAMES.TRADE_EXECUTE)
@Injectable()
export class TradeProcessor {
  private readonly logger = new Logger(TradeProcessor.name);

  constructor() {}

  @Process()
  async handleTrade(job: Job<TradeExecuteJob>) {
    const { symbol, side, quantity, reason, compositeScore, exchangeAccountId, idempotencyKey, userId } = job.data;
    this.logger.log(`Processing trade job for ${symbol} ${side} (score: ${compositeScore})`);

    if (compositeScore < 80) {
      this.logger.log(`Trade skipped — score below threshold`);
      return { success: false, reason: 'Score below threshold', skipped: true };
    }

    // TODO: Replace with proper integration to ExecutionService or ExecuteTradeUseCase
    // For demo, simulate successful execution
    this.logger.log(`[TODO] Executing trade for ${symbol} qty=${quantity} user=${userId}`);

    return { success: true, tradeId: `sim-${Date.now()}`, status: 'FILLED' };
  }
}
