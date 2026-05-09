import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
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
  status: 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';
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
  private virtualPositions = new Map<string, Map<string, VirtualPosition>>();

  private readonly DEFAULT_BALANCE = 10000;
  private readonly SLIPPAGE_BPS = 10;
  private readonly TAKER_FEE_RATE = 0.001;

  constructor(private readonly prisma: PrismaService) {
    this.logger.log('PaperTradingService initialized with Prisma persistence');
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
  }): Promise<PaperOrder> {
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

    // 建立 Paper Order 物件
    const order: PaperOrder = {
      id: orderId,
      userId,
      symbol,
      side,
      quantity,
      price,
      executedPrice,
      fee,
      filledQuantity: fillImmediately ? quantity : 0,
      status: fillImmediately ? 'FILLED' : 'OPEN',
      createdAt: new Date(),
    };

    // === 持久化到 Trade table（isPaper = true）===
    try {
      await this.prisma.trade.create({
        data: {
          id: orderId,
          userId,
          exchangeAccountId,
          symbol,
          side,
          type: 'MARKET',
          status: order.status === 'FILLED' ? 'FILLED' : 'PENDING',
          quantity,
          price: executedPrice,
          filledQuantity: order.filledQuantity,
          isPaper: true,
          idempotencyKey: orderId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to persist paper trade', error);
    }

    if (fillImmediately) {
      this.updateVirtualPosition(order);
    }

    this.logger.log(
      `[Paper] ${side} ${quantity} ${symbol} @ ${executedPrice.toFixed(2)} (persisted)`,
    );

    return order;
  }

  async simulatePartialFill(orderId: string, fillPercentage: number) {
    // TODO: 之後可更新 DB 狀態
    this.logger.warn('simulatePartialFill not fully persisted yet');
    return null;
  }

  private updateVirtualPosition(order: PaperOrder) {
    const userPositions = this.virtualPositions.get(order.userId) || new Map();
    const existing = userPositions.get(order.symbol);

    const filledQty = order.side === 'BUY' ? order.filledQuantity : -order.filledQuantity;

    if (!existing) {
      userPositions.set(order.symbol, {
        symbol: order.symbol,
        quantity: filledQty,
        averagePrice: order.executedPrice,
        unrealizedPnl: 0,
      });
    } else {
      const totalCost = existing.averagePrice * existing.quantity + order.executedPrice * filledQty;
      const newQuantity = existing.quantity + filledQty;

      if (newQuantity === 0) {
        userPositions.delete(order.symbol);
      } else {
        existing.quantity = newQuantity;
        existing.averagePrice = totalCost / newQuantity;
      }
    }

    this.virtualPositions.set(order.userId, userPositions);
  }

  getVirtualPositions(userId: string): VirtualPosition[] {
    const positions = this.virtualPositions.get(userId);
    return positions ? Array.from(positions.values()) : [];
  }

  async getPaperOrders(userId: string) {
    // 從資料庫讀取 Paper Trades
    return this.prisma.trade.findMany({
      where: {
        userId,
        isPaper: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
