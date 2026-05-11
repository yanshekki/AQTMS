import { Injectable, Inject, Optional } from '@nestjs/common';
import { Order } from './interfaces/order.entity';
import { OrderStatus } from './interfaces/order-status.enum';
import { IOrderRepository } from './interfaces/order.repository';

@Injectable()
export class OrderService {
  constructor(
    @Optional() @Inject('ORDER_REPOSITORY')
    private readonly repository?: IOrderRepository,
  ) {}

  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    if (!this.repository) {
      throw new Error('OrderRepository not available');
    }
    return this.repository.create(orderData);
  }

  async findById(id: string): Promise<Order | undefined> {
    if (!this.repository) return undefined;
    const order = await this.repository.findById(id);
    return order || undefined;
  }

  async findByExchangeOrderId(exchangeOrderId: string): Promise<Order | undefined> {
    if (!this.repository) return undefined;
    const order = await this.repository.findByExchangeOrderId(exchangeOrderId);
    return order || undefined;
  }

  async applyPartialFill(orderId: string, filledQuantity: number, avgPrice: number): Promise<Order | undefined> {
    if (!this.repository) return undefined;

    const order = await this.findById(orderId);
    if (!order) return undefined;

    const newFilled = (order.filledQuantity || 0) + filledQuantity;
    const newStatus = newFilled >= order.quantity ? OrderStatus.FILLED : OrderStatus.PARTIALLY_FILLED;

    return this.repository.update(orderId, {
      filledQuantity: newFilled,
      averageFillPrice: avgPrice,
      status: newStatus,
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | undefined> {
    if (!this.repository) return undefined;
    return this.repository.update(orderId, { status });
  }

  async cancelOrder(orderId: string): Promise<Order | undefined> {
    return this.updateOrderStatus(orderId, OrderStatus.CANCELLED);
  }
}
