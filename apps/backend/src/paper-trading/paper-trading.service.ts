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
    this.logger.log('PaperTradingService initialized (positions calculated from DB)');
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
  }): Promise<any> {
    const { userId, exchangeAccountId, symbol, side, quantity, price, fillImmediately = true } = orderData;

    const slippagePercent = (Math.random() * this.SLIPPAGE_BPS + this.SLIPPAGE_BPS / 2) / 10000;
    const slippage = slippagePercent * (side === 'BUY' ? 1 : -1);
    const executedPrice = price * (1 + slippage);

    const notional = quantity * executedPrice;
    const fee = notional * this.TAKER_FEE_RATE;

    let currentBalance = this.getVirtualBalance(userId);
    const costWithFee = side === 'BUY' ? notional + fee : notional - fee;

    if (side === 'BUY' && currentBalance < costWithFee) {
      throw new Error(`虛擬餘額不足`);
    }

    if (side === 'BUY') currentBalance -= costWithFee;
    else currentBalance += costWithFee;

    this.virtualBalances.set(userId, currentBalance);

    const orderId = 'paper-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    // 持久化 Paper Order
    await this.prisma.trade.create({
      data: {
        id: orderId,
        userId,
        exchangeAccountId,
        symbol,
        side,
        type: 'MARKET',
        status: fillImmediately ? 'FILLED' : 'PENDING',
        quantity,
        price: executedPrice,
        filledQuantity: fillImmediately ? quantity : 0,
        isPaper: true,
        idempotencyKey: orderId,
      },
    });

    this.logger.log(`[Paper] ${side} ${quantity} ${symbol} persisted to DB`);

    return {
      id: orderId,
      isPaper: true,
      status: fillImmediately ? 'FILLED' : 'OPEN',
    };
  }

  /**
   * 從資料庫計算虛擬持倉（推薦做法）
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
          unrealizedPnl: 0, // TODO: 可之後用最新價格計算
        });
      }
    }

    return result;
  }

  async getPaperOrders(userId: string) {
    return this.prisma.trade.findMany({
      where: { userId, isPaper: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
