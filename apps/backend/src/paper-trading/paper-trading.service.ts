import { Injectable, Logger } from '@nestjs/common';

export interface PaperOrder {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executedPrice: number;
  fee: number;
  filledQuantity: number;  // 已成交數量
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
  private paperOrders = new Map<string, PaperOrder>(); // id -> order

  private readonly DEFAULT_BALANCE = 10000;
  private readonly SLIPPAGE_BPS = 10;
  private readonly TAKER_FEE_RATE = 0.001;

  constructor() {
    this.logger.log('PaperTradingService initialized with Partial Fill support');
  }

  getVirtualBalance(userId: string): number {
    return this.virtualBalances.get(userId) ?? this.DEFAULT_BALANCE;
  }

  /**
   * 下單（預設即時全成交，可改為部分成交）
   */
  async placePaperOrder(orderData: {
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    fillImmediately?: boolean; // true = 即時全成交
  }): Promise<PaperOrder> {
    const { userId, symbol, side, quantity, price, fillImmediately = true } = orderData;

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

    this.paperOrders.set(orderId, order);

    if (fillImmediately) {
      this.updateVirtualPosition(order);
    }

    this.logger.log(
      `[Paper] ${side} ${quantity} ${symbol} @ ${executedPrice.toFixed(2)} ` +
      `(status: ${order.status})`,
    );

    return order;
  }

  /**
   * 模擬部分成交（Partial Fill）
   */
  async simulatePartialFill(orderId: string, fillPercentage: number): Promise<PaperOrder | null> {
    const order = this.paperOrders.get(orderId);
    if (!order || order.status === 'FILLED' || order.status === 'CANCELLED') {
      return null;
    }

    const fillQty = order.quantity * (fillPercentage / 100);
    const newFilled = Math.min(order.filledQuantity + fillQty, order.quantity);

    order.filledQuantity = newFilled;
    order.status = newFilled >= order.quantity ? 'FILLED' : 'PARTIALLY_FILLED';

    // 更新持倉（只計已成交部分）
    if (order.filledQuantity > 0) {
      this.updateVirtualPosition(order);
    }

    this.logger.log(
      `[Paper] Partial fill on ${orderId}: ${order.filledQuantity}/${order.quantity} (${order.status})`,
    );

    return order;
  }

  private updateVirtualPosition(order: PaperOrder) {
    const userPositions = this.virtualPositions.get(order.userId) || new Map();
    const existing = userPositions.get(order.symbol);

    // 只計算已成交嘅數量
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

  getPaperOrder(orderId: string): PaperOrder | undefined {
    return this.paperOrders.get(orderId);
  }

  getPaperOrders(userId: string): PaperOrder[] {
    return Array.from(this.paperOrders.values()).filter(o => o.userId === userId);
  }
}
