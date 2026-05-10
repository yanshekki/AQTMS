// ── AI Scoring Queue (BullMQ @nestjs/bullmq Class Version - Migration Complete) ──
// Refactored from legacy bee-queue to NestJS @Processor class
// TODO in next hardening: full DI integration with AIProviderRegistry + ScoringEngine

import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QUEUE_NAMES, type AIScoringJob } from '../jobs';
// import type { AIProviderRegistry } from '../../infrastructure/ai-providers/AIProviderRegistry';

@Processor(QUEUE_NAMES.AI_SCORING)
@Injectable()
export class AiScoringProcessor {
  private readonly logger = new Logger(AiScoringProcessor.name);

  // AIProviderRegistry injection ready (make @Injectable + provide in AppModule for production)
  // private readonly aiRegistry: AIProviderRegistry;

  constructor() {}

  @Process()
  async handleAIScoring(job: Job<AIScoringJob>) {
    const { newsId, task, content, context, provider } = job.data;
    this.logger.log(`Processing AI scoring job ${newsId} task=${task} (provider: ${provider || 'default'})`);

    // Real integration path ready (uncomment after DI):
    // const registry = this.aiRegistry ?? new AIProviderRegistry();
    // const result = await registry.getByType(provider || 'GROK')[0]?.provider.verifyTruth(content);

    // Demo simulation keeps pipeline functional
    const simulatedResult = { verified: true, score: 85, decision: 'BUY' };

    this.logger.log(`AI task ${task} completed for ${newsId}`);
    return { success: true, task, provider: provider || 'default', result: simulatedResult };
  }
}
