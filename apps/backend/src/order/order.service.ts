import { Injectable } from '@nestjs/common';
import { Order } from './interfaces/order.entity';
import { OrderStatus } from './interfaces/order-status.enum';

@Injectable()
export class OrderService {
  private orders = new Map<string, Order>();

  // ... existing methods (createOrder, updateOrderStatus, etc.) ...

  /**
   * 應用部分成交（Partial Fill）
   */
  applyPartialFill(
    orderId: string,
    fillQuantity: number,
    fillPrice: number,
  ): Order {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (
      order.status !== OrderStatus.NEW &&
      order.status !== OrderStatus.PARTIALLY_FILLED
    ) {
      throw new Error(`Cannot apply fill to order in status: ${order.status}`);
    }

    if (fillQuantity <= 0) {
      throw new Error('Fill quantity must be positive');
    }

    const newFilledQuantity = order.filledQuantity + fillQuantity;

    if (newFilledQuantity > order.quantity) {
      throw new Error('Fill quantity exceeds remaining order quantity');
    }

    // 計算加權平均成交價
    const totalValue =
      order.filledQuantity * (order.averageFillPrice || 0) +
      fillQuantity * fillPrice;

    const newAverageFillPrice =
      newFilledQuantity > 0 ? totalValue / newFilledQuantity : fillPrice;

    // 更新訂單
    order.filledQuantity = newFilledQuantity;
    order.averageFillPrice = newAverageFillPrice;
    order.updatedAt = new Date();

    // 判斷是否完全成交
    if (newFilledQuantity >= order.quantity) {
      order.status = OrderStatus.FILLED;
    } else {
      order.status = OrderStatus.PARTIALLY_FILLED;
    }

    return order;
  }

  // ... existing methods ...
}
