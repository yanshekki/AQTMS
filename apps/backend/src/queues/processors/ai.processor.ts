// ── AI Scoring Queue (BullMQ @nestjs/bullmq Class Version) ──
// Refactored from bee-queue global style to NestJS @Processor class

import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QUEUE_NAMES, type AIScoringJob } from '../jobs';
import type { AIProviderRegistry } from '../../infrastructure/ai-providers/AIProviderRegistry';

@Processor(QUEUE_NAMES.AI_SCORING)
@Injectable()
export class AiScoringProcessor {
  private readonly logger = new Logger(AiScoringProcessor.name);

  // TODO: Inject AIProviderRegistry properly once it's made @Injectable
  // For now, we keep a placeholder; in real impl inject via constructor
  private aiRegistry: AIProviderRegistry | null = null;

  constructor() {}

  @Process()
  async handleAIScoring(job: Job<AIScoringJob>) {
    const { newsId, task, content, context, provider } = job.data;
    this.logger.log(`Processing AI scoring job ${newsId} task=${task}`);

    // TODO: Integrate with injected AIProviderRegistry
    // Simulate result for demo
    const simulatedResult = { verified: true, score: 85, decision: 'BUY' };

    this.logger.log(`AI task ${task} completed for ${newsId}`);
    return { success: true, task, provider: provider || 'default', result: simulatedResult };
  }
}
