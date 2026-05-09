import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';

export interface VirtualPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  unrealizedPnl: number;
}

@Injectable()
export class PaperTradingService {
  private readonly logger = new Logger(PaperTradingService.name);

  private virtualBalances = new Map<string, number>();

  private readonly DEFAULT_BALANCE = 10000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {
    this.logger.log('PaperTradingService initialized with MarketDataService integration');
  }

  getVirtualBalance(userId: string): number {
    return this.virtualBalances.get(userId) ?? this.DEFAULT_BALANCE;
  }

  /**
   * 獲取 Paper 持倉 + 使用 MarketDataService 自動計算未實現盈虧
   * 這係最方便嘅方法
   */
  async getPaperPositionsWithLivePnL(userId: string): Promise<VirtualPosition[]> {
    const positions = await this.getVirtualPositionsFromDb(userId);

    if (positions.length === 0) {
      return [];
    }

    const symbols = positions.map(p => p.symbol);
    const currentPrices = await this.marketDataService.getPrices(symbols);

    return this.calculateUnrealizedPnL(positions, currentPrices);
  }

  /**
   * 獲取 Paper 持倉 + 手動提供價格來源
   */
  async getPaperPositionsWithPnL(
    userId: string,
    priceProvider: (symbol: string) => Promise<number>,
  ): Promise<VirtualPosition[]> {
    const positions = await this.getVirtualPositionsFromDb(userId);

    if (positions.length === 0) {
      return [];
    }

    const priceMap: Record<string, number> = {};
    for (const position of positions) {
      try {
        priceMap[position.symbol] = await priceProvider(position.symbol);
      } catch {
        priceMap[position.symbol] = 0;
      }
    }

    return this.calculateUnrealizedPnL(positions, priceMap);
  }

  async getVirtualPositionsFromDb(userId: string): Promise<VirtualPosition[]> {
    const paperTrades = await this.prisma.trade.findMany({
      where: {
        userId,
        isPaper: true,
        status: 'FILLED',
      },
      orderBy: { createdAt: 'asc' },
    });

    const positionMap = new Map<string, { quantity: number; totalCost: number }>();

    for (const trade of paperTrades) {
      const key = trade.symbol;
      const qty = trade.side === 'BUY' ? trade.filledQuantity : -trade.filledQuantity;
      const cost = trade.filledQuantity * (trade.price || 0);

      if (!positionMap.has(key)) {
        positionMap.set(key, { quantity: 0, totalCost: 0 });
      }

      const pos = positionMap.get(key)!;
      pos.quantity += qty;
      pos.totalCost += cost;
    }

    const result: VirtualPosition[] = [];

    for (const [symbol, pos] of positionMap.entries()) {
      if (pos.quantity !== 0) {
        result.push({
          symbol,
          quantity: pos.quantity,
          averagePrice: pos.totalCost / pos.quantity,
          unrealizedPnl: 0,
        });
      }
    }

    return result;
  }

  calculateUnrealizedPnL(
    positions: VirtualPosition[],
    currentPrices: Record<string, number>,
  ): VirtualPosition[] {
    return positions.map((position) => {
      const currentPrice = currentPrices[position.symbol];

      if (!currentPrice || position.quantity === 0) {
        return { ...position, unrealizedPnl: 0 };
      }

      const pnl = (currentPrice - position.averagePrice) * position.quantity;
      return {
        ...position,
        unrealizedPnl: parseFloat(pnl.toFixed(2)),
      };
    });
  }

  async getPaperOrders(userId: string) {
    return this.prisma.trade.findMany({
      where: { userId, isPaper: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
