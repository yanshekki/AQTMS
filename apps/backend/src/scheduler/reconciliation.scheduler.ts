import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReconciliationScheduler {
  private readonly logger = new Logger(ReconciliationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('reconciliation') private readonly reconciliationQueue: Queue,
  ) {}

  // Run every 10 minutes
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleReconciliationCron() {
    this.logger.log('Running scheduled Reconciliation automation...');

    try {
      const users = await this.prisma.user.findMany({ take: 50 });

      for (const user of users) {
        await this.reconciliationQueue.add(
          'run-reconciliation',
          { userId: user.id, timestamp: new Date() },
          { attempts: 2, backoff: { type: 'exponential', delay: 3000 } },
        );
      }

      this.logger.log(`Enqueued reconciliation for ${users.length} users`);
    } catch (error) {
      this.logger.error('Reconciliation cron failed', error);
    }
  }
}
