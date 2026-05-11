import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('ai-queue')
export class AIProcessor extends WorkerHost {
  private readonly logger = new Logger(AIProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing AI job ${job.id} of type ${job.name}`);

    if (job.name === 'analyze-signal') {
      return this.handleAnalyzeSignal(job);
    }

    return { success: false, message: 'Unknown job type' };
  }

  private async handleAnalyzeSignal(job: Job) {
    const { symbol, data } = job.data;
    this.logger.log(`Analyzing signal for ${symbol}`);

    // TODO: Call AI provider (Gemini/OpenAI)
    return { success: true, symbol, analysis: 'placeholder' };
  }
}
