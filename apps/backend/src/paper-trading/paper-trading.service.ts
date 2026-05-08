import { Injectable } from '@nestjs/common';

export interface PaperOrder {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;           // 委託價格
  executedPrice: number;   // 實際成交價格（含滑點）
  status: 'FILLED' | 'OPEN' | 'CANCELLED';
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
  // 記憶體儲存（MVP）
  private virtualBalances = new Map<string, number>(); // userId -> USDT balance
  private virtualPositions = new Map<string, Map<string, VirtualPosition>>();
  private paperOrders: PaperOrder[] = [];

  private readonly DEFAULT_BALANCE = 10000; // 預設虛擬 USDT 餘額

  constructor() {
    // 可在此初始化測試用戶的餘額
  }

  /**
   * 獲取用戶虛擬餘額
   */
  getVirtualBalance(userId: string): number {
    return this.virtualBalances.get(userId) ?? this.DEFAULT_BALANCE;
  }

  /**
   * 模擬下單（含滑點 + 餘額更新）
   */
  async placePaperOrder(orderData: {
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
  }): Promise<PaperOrder> {
    const { userId, symbol, side, quantity, price } = orderData;

    // 簡單滑點模擬（市價單 ±0.1% ~ 0.3%）
    const slippage = (Math.random() * 0.002 + 0.001) * (side === 'BUY' ? 1 : -1);
    const executedPrice = price * (1 + slippage);

    // 計算所需金額
    const cost = quantity * executedPrice;

    // 檢查餘額（買入時）
    let currentBalance = this.getVirtualBalance(userId);
    if (side === 'BUY' && currentBalance < cost) {
      throw new Error('虛擬餘額不足');
    }

    // 更新餘額
    if (side === 'BUY') {
      currentBalance -= cost;
    } else {
      currentBalance += cost;
    }
    this.virtualBalances.set(userId, currentBalance);

    // 建立訂單
    const order: PaperOrder = {
      id: 'paper-' + Date.now(),
      userId,
      symbol,
      side,
      quantity,
      price, // 委託價
      executedPrice,
      status: 'FILLED',
      createdAt: new Date(),
    };

    this.paperOrders.push(order);

    // 更新持倉
    this.updateVirtualPosition(order);

    console.log(
      `[PaperTrading] ${side} ${quantity} ${symbol} @ ${executedPrice.toFixed(2)} (slippage: ${(slippage * 100).toFixed(2)}%)`,
    );

    return order;
  }

  /**
   * 更新虛擬持倉
   */
  private updateVirtualPosition(order: PaperOrder) {
    const userPositions = this.virtualPositions.get(order.userId) || new Map();
    const existing = userPositions.get(order.symbol);

    const executedQty = order.side === 'BUY' ? order.quantity : -order.quantity;

    if (!existing) {
      userPositions.set(order.symbol, {
        symbol: order.symbol,
        quantity: executedQty,
        averagePrice: order.executedPrice,
        unrealizedPnl: 0,
      });
    } else {
      const totalCost = existing.averagePrice * existing.quantity + order.executedPrice * executedQty;
      const newQuantity = existing.quantity + executedQty;

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

  getPaperOrders(userId: string): PaperOrder[] {
    return this.paperOrders.filter((o) => o.userId === userId);
  }
}
