import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { PortfolioService } from '../../portfolio/portfolio.service';

@Processor('portfolio-snapshots')
@Injectable()
export class PortfolioSnapshotProcessor {
  private readonly logger = new Logger(PortfolioSnapshotProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly portfolioService: PortfolioService,
  ) {}

  async handleCreateSnapshot(job: Job<{ userId: string; timestamp: Date }>) {
    const { userId, timestamp } = job.data;
    this.logger.log(`Processing create-snapshot job for user ${userId}`);

    try {
      // Use real positions from PortfolioService (live/paper/DB fallback)
      const positions = await this.portfolioService.getPositions(userId);
      const totalValue = positions.reduce((sum, p) => sum + Math.abs(p.quantity || 0) * (p.currentPrice || p.avgPrice || 0), 0);

      const snapshot = await this.prisma.portfolioSnapshot.create({
        data: {
          userId,
          totalValue: parseFloat(totalValue.toFixed(2)),
          positions: positions as any,
          timestamp: new Date(timestamp),
        },
      });

      this.logger.log(`Created real PortfolioSnapshot ${snapshot.id} for user ${userId} with ${positions.length} positions`);

      // Push real-time update via WebSocket
      this.websocketGateway.pushPositionUpdate?.(userId, { 
        type: 'snapshot', 
        snapshotId: snapshot.id,
        totalValue: snapshot.totalValue,
        timestamp: snapshot.timestamp,
        positionCount: positions.length,
      });

      return { success: true, snapshotId: snapshot.id };
    } catch (error: any) {
      this.logger.error(`Failed to create snapshot for user ${userId}`, error.stack);
      throw error;
    }
  }
}
