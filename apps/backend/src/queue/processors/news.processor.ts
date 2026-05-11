import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('news-queue')
export class NewsProcessor extends WorkerHost {
  private readonly logger = new Logger(NewsProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing news job ${job.id}`);

    if (job.name === 'process-news') {
      return this.handleProcessNews(job);
    }

    return { success: false };
  }

  private async handleProcessNews(job: Job) {
    const { newsId, content } = job.data;
    this.logger.log(`Processing news event ${newsId}`);

    // TODO: Analyze news with AI
    return { success: true, newsId };
  }
}
