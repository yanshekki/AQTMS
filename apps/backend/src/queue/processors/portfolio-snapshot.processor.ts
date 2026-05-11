import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('portfolio-snapshot-queue')
export class PortfolioSnapshotProcessor extends WorkerHost {
  private readonly logger = new Logger(PortfolioSnapshotProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing portfolio snapshot job ${job.id}`);

    if (job.name === 'take-snapshot') {
      return this.handleTakeSnapshot(job);
    }

    return { success: false };
  }

  private async handleTakeSnapshot(job: Job) {
    const { userId } = job.data;
    this.logger.log(`Taking portfolio snapshot for user ${userId}`);

    // TODO: Calculate and save portfolio snapshot
    return { success: true, userId };
  }
}
