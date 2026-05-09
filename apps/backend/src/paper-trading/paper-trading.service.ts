import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {
    this.logger.log('PaperTradingService initialized with PnL + Price Provider support');
  }

  getVirtualBalance(userId: string): number {
    return this.virtualBalances.get(userId) ?? this.DEFAULT_BALANCE;
  }

  /**
   * 獲取 Paper 持倉 + 自動計算未實現盈虧
   * priceProvider: 注入價格來源（可來自 WebSocket / Exchange API）
   */
  async getPaperPositionsWithPnL(
    userId: string,
    priceProvider: (symbol: string) => Promise<number>,
  ): Promise<VirtualPosition[]> {
    // 1. 從資料庫獲取持倉
    const positions = await this.getVirtualPositionsFromDb(userId);

    if (positions.length === 0) {
      return [];
    }

    // 2. 獲取所有需要嘅價格
    const symbols = positions.map(p => p.symbol);
    const priceMap: Record<string, number> = {};

    for (const symbol of symbols) {
      try {
        priceMap[symbol] = await priceProvider(symbol);
      } catch (error) {
        this.logger.warn(`Failed to get price for ${symbol}`);
        priceMap[symbol] = 0;
      }
    }

    // 3. 計算未實現盈虧
    return this.calculateUnrealizedPnL(positions, priceMap);
  }

  /**
   * 從資料庫計算虛擬持倉
   */
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

  /**
   * 計算未實現盈虧
   */
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
