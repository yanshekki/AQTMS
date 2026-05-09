import { Injectable } from '@nestjs/common';
import { Order } from './interfaces/order.entity';
import { OrderStatus } from './interfaces/order-status.enum';

@Injectable()
export class OrderService {
  private orders = new Map<string, Order>(); // MVP 使用記憶體儲存

  // 定義允許的狀態轉移
  private readonly allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.NEW]: [OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED, OrderStatus.CANCELED, OrderStatus.REJECTED],
    [OrderStatus.PARTIALLY_FILLED]: [OrderStatus.FILLED, OrderStatus.CANCELED],
    [OrderStatus.FILLED]: [],
    [OrderStatus.CANCELED]: [],
    [OrderStatus.REJECTED]: [],
    [OrderStatus.EXPIRED]: [],
  };

  createOrder(data: Omit<Order, 'id' | 'status' | 'filledQuantity' | 'createdAt' | 'updatedAt'>): Order {
    const order: Order = {
      ...data,
      id: 'order-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      status: OrderStatus.NEW,
      filledQuantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(order.id, order);
    return order;
  }

  updateOrderStatus(orderId: string, newStatus: OrderStatus, filledQuantity?: number, averageFillPrice?: number): Order {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // 檢查狀態轉移是否合法
    const allowedNextStates = this.allowedTransitions[order.status] || [];
    if (!allowedNextStates.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
    }

    // 更新狀態
    order.status = newStatus;
    order.updatedAt = new Date();

    if (filledQuantity !== undefined) {
      order.filledQuantity = filledQuantity;
    }

    if (averageFillPrice !== undefined) {
      order.averageFillPrice = averageFillPrice;
    }

    // 如果完全成交，自動設為 FILLED
    if (order.filledQuantity >= order.quantity && order.status !== OrderStatus.FILLED) {
      order.status = OrderStatus.FILLED;
    }

    return order;
  }

  cancelOrder(orderId: string): Order {
    return this.updateOrderStatus(orderId, OrderStatus.CANCELED);
  }

  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  getOrdersByUser(userId: string): Order[] {
    return Array.from(this.orders.values()).filter(o => o.userId === userId);
  }

  getActiveOrders(userId: string): Order[] {
    return this.getOrdersByUser(userId).filter(o =>
      o.status === OrderStatus.NEW || o.status === OrderStatus.PARTIALLY_FILLED
    );
  }
}
