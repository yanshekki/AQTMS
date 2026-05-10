import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class PortfolioSnapshotScheduler {
  private readonly logger = new Logger(PortfolioSnapshotScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('portfolio-snapshots') private readonly snapshotQueue: Queue,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  // Run every minute for demo; in prod use 5min or on trade events
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.log('Running scheduled PortfolioSnapshot automation...');
    try {
      // Enqueue snapshot job for all active users or specific
      const users = await this.prisma.user.findMany({ take: 100 }); // limit for demo
      for (const user of users) {
        await this.snapshotQueue.add(
          'create-snapshot',
          { userId: user.id, timestamp: new Date() },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
      }
      this.logger.log(`Enqueued snapshots for ${users.length} users`);
    } catch (error) {
      this.logger.error('Snapshot cron failed', error.stack);
    }
  }

  // Example: monitor partial fills via queue or event
  // In real impl, listen to ExecutionLog or Order events for partial fills
  async monitorPartialFills() {
    // Could be triggered by events from ExecutionService
    // For demo, push example
    // this.websocketGateway.pushPartialFill(userId, fillData);
  }

  // Job processor would be in a separate processor class using @Processor('portfolio-snapshots')
}