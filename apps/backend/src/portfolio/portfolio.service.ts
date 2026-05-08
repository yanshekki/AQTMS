import { Injectable } from '@nestjs/common';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
// TODO: 之後注入 ExecutionService / Exchange adapters 來獲取真實持倉

export interface PortfolioSummary {
  totalValue: number;
  totalUnrealizedPnl: number;
  totalRiskExposure: number;
  positionCount: number;
  lastUpdated: Date;
}

export interface Position {
  symbol: string;
  exchange: string;
  side: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  isPaper: boolean;
}

@Injectable()
export class PortfolioService {
  constructor(
    private readonly paperTradingService: PaperTradingService,
    // TODO: private readonly executionService: ExecutionService,
  ) {}

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const positions = await this.getPositions(userId);

    const totalValue = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const totalRiskExposure = totalValue > 0 ? Math.min((totalValue / 30000) * 100, 100) : 0; // 簡單風險計算

    return {
      totalValue,
      totalUnrealizedPnl,
      totalRiskExposure,
      positionCount: positions.length,
      lastUpdated: new Date(),
    };
  }

  async getPositions(userId: string): Promise<Position[]> {
    const positions: Position[] = [];

    // 1. 獲取 Paper Trading 持倉
    const paperPositions = this.paperTradingService.getVirtualPositions(userId);
    for (const p of paperPositions) {
      positions.push({
        symbol: p.symbol,
        exchange: 'PAPER',
        side: p.quantity > 0 ? 'BUY' : 'SELL',
        quantity: Math.abs(p.quantity),
        averagePrice: p.averagePrice,
        currentPrice: p.averagePrice, // TODO: 之後從行情服務獲取最新價
        unrealizedPnl: p.unrealizedPnl,
        unrealizedPnlPercent: 0,
        isPaper: true,
      });
    }

    // 2. TODO: 獲取真實交易所持倉
    // const livePositions = await this.executionService.getLivePositions(userId);
    // positions.push(...livePositions);

    return positions;
  }
}
