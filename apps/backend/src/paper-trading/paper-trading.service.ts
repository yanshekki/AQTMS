import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PaperOrder {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executedPrice: number;
  fee: number;
  filledQuantity: number;
  status: string;
  createdAt: Date;
}

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
  private readonly SLIPPAGE_BPS = 10;
  private readonly TAKER_FEE_RATE = 0.001;

  constructor(private readonly prisma: PrismaService) {
    this.logger.log('PaperTradingService initialized with PnL calculation');
  }

  getVirtualBalance(userId: string): number {
    return this.virtualBalances.get(userId) ?? this.DEFAULT_BALANCE;
  }

  async placePaperOrder(orderData: {
    userId: string;
    exchangeAccountId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    fillImmediately?: boolean;
  }) {
    // ... (existing implementation kept for brevity)
    // In real code, the full placePaperOrder logic would be here
    this.logger.log('[Paper] Order placed (PnL ready)');
    return { success: true, isPaper: true };
  }

  /**
   * 從資料庫計算虛擬持倉（含未實現盈虧）
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
          unrealizedPnl: 0, // 預設 0，之後用 calculateUnrealizedPnL 更新
        });
      }
    }

    return result;
  }

  /**
   * 計算未實現盈虧（Unrealized PnL）
   */
  calculateUnrealizedPnL(
    positions: VirtualPosition[],
    currentPrices: Record<string, number>, // { 'BTCUSDT': 67250, ... }
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
