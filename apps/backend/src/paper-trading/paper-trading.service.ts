import { Injectable } from '@nestjs/common';

export interface PaperOrder {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
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
  // 簡單的記憶體儲存（MVP 階段）
  private virtualPositions = new Map<string, Map<string, VirtualPosition>>(); // userId -> symbol -> position
  private paperOrders: PaperOrder[] = [];

  /**
   * 模擬下單
   */
  async placePaperOrder(orderData: {
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
  }): Promise<PaperOrder> {
    const order: PaperOrder = {
      id: 'paper-' + Date.now(),
      userId: orderData.userId,
      symbol: orderData.symbol,
      side: orderData.side,
      quantity: orderData.quantity,
      price: orderData.price,
      status: 'FILLED', // MVP 直接模擬成交
      createdAt: new Date(),
    };

    this.paperOrders.push(order);

    // 更新虛擬持倉
    this.updateVirtualPosition(order);

    console.log(`[PaperTrading] Order filled: ${order.side} ${order.quantity} ${order.symbol} @ ${order.price}`);

    return order;
  }

  /**
   * 更新虛擬持倉
   */
  private updateVirtualPosition(order: PaperOrder) {
    const userPositions = this.virtualPositions.get(order.userId) || new Map();
    const existing = userPositions.get(order.symbol);

    if (!existing) {
      userPositions.set(order.symbol, {
        symbol: order.symbol,
        quantity: order.side === 'BUY' ? order.quantity : -order.quantity,
        averagePrice: order.price,
        unrealizedPnl: 0,
      });
    } else {
      // 簡單的平均成本計算（MVP）
      const totalQty = existing.quantity + (order.side === 'BUY' ? order.quantity : -order.quantity);
      const newAvgPrice =
        (existing.averagePrice * existing.quantity + order.price * order.quantity) / totalQty || order.price;

      existing.quantity = totalQty;
      existing.averagePrice = newAvgPrice;
    }

    this.virtualPositions.set(order.userId, userPositions);
  }

  /**
   * 獲取用戶虛擬持倉
   */
  getVirtualPositions(userId: string): VirtualPosition[] {
    const positions = this.virtualPositions.get(userId);
    return positions ? Array.from(positions.values()) : [];
  }

  /**
   * 獲取用戶模擬訂單歷史
   */
  getPaperOrders(userId: string): PaperOrder[] {
    return this.paperOrders.filter((o) => o.userId === userId);
  }
}
