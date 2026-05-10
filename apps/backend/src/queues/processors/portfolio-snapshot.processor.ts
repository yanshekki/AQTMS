import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

@Processor('portfolio-snapshots')
@Injectable()
export class PortfolioSnapshotProcessor {
  private readonly logger = new Logger(PortfolioSnapshotProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  @Process('create-snapshot')
  async handleCreateSnapshot(job: Job<{ userId: string; timestamp: Date }>) {
    const { userId, timestamp } = job.data;
    this.logger.log(`Processing create-snapshot job for user ${userId}`);

    try {
      // TODO: Integrate with PortfolioService.getPortfolioSummary or calculate real positions
      // For now, create a demo snapshot (in production, fetch real positions/PnL)
      const demoPositions = [
        { symbol: 'BTCUSDT', quantity: 0.5, avgPrice: 65000, currentPrice: 67000, pnl: 1000 },
        { symbol: 'ETHUSDT', quantity: 2, avgPrice: 3200, currentPrice: 3100, pnl: -200 },
      ];
      const totalValue = demoPositions.reduce((sum, p) => sum + Math.abs(p.quantity) * p.currentPrice, 0);

      const snapshot = await this.prisma.portfolioSnapshot.create({
        data: {
          userId,
          totalValue: parseFloat(totalValue.toFixed(2)),
          positions: demoPositions as any,
          timestamp: new Date(timestamp),
        },
      });

      this.logger.log(`Created PortfolioSnapshot ${snapshot.id} for user ${userId}`);

      // Push real-time update via WebSocket
      this.websocketGateway.pushPositionUpdate?.(userId, { 
        type: 'snapshot', 
        snapshotId: snapshot.id, 
        totalValue: snapshot.totalValue,
        timestamp: snapshot.timestamp 
      });

      return { success: true, snapshotId: snapshot.id };
    } catch (error) {
      this.logger.error(`Failed to create snapshot for user ${userId}`, error.stack);
      throw error;
    }
  }
}