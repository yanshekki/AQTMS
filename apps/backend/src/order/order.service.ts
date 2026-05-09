import { Injectable, Inject, Optional } from '@nestjs/common';
import { Order } from './interfaces/order.entity';
import { OrderStatus } from './interfaces/order-status.enum';
import { IOrderRepository } from './interfaces/order.repository';

@Injectable()
export class OrderService {
  constructor(
    @Optional() @Inject('ORDER_REPOSITORY')
    private readonly orderRepository?: IOrderRepository,
  ) {}

  private get repository(): IOrderRepository {
    if (!this.orderRepository) {
      throw new Error('OrderRepository not provided');
    }
    return this.orderRepository;
  }

  async createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    return this.repository.create(data);
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    filledQuantity?: number,
    averageFillPrice?: number,
  ): Promise<Order> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const updateData: Partial<Order> = { status: newStatus, updatedAt: new Date() };

    if (filledQuantity !== undefined) updateData.filledQuantity = filledQuantity;
    if (averageFillPrice !== undefined) updateData.averageFillPrice = averageFillPrice;

    return this.repository.update(orderId, updateData);
  }

  async applyPartialFill(
    orderId: string,
    fillQuantity: number,
    fillPrice: number,
  ): Promise<Order> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.status !== OrderStatus.NEW && order.status !== OrderStatus.PARTIALLY_FILLED) {
      throw new Error(`Cannot apply fill to order in status: ${order.status}`);
    }

    const newFilledQuantity = order.filledQuantity + fillQuantity;

    if (newFilledQuantity > order.quantity) {
      throw new Error('Fill quantity exceeds remaining order quantity');
    }

    const totalValue =
      order.filledQuantity * (order.averageFillPrice || 0) + fillQuantity * fillPrice;

    const newAverageFillPrice = newFilledQuantity > 0 ? totalValue / newFilledQuantity : fillPrice;

    const updateData: Partial<Order> = {
      filledQuantity: newFilledQuantity,
      averageFillPrice: newAverageFillPrice,
      updatedAt: new Date(),
      status: newFilledQuantity >= order.quantity ? OrderStatus.FILLED : OrderStatus.PARTIALLY_FILLED,
    };

    return this.repository.update(orderId, updateData);
  }

  async getOrder(orderId: string): Promise<Order | undefined> {
    const order = await this.repository.findById(orderId);
    return order || undefined;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.repository.findByUser(userId);
  }

  async getActiveOrders(userId: string): Promise<Order[]> {
    const orders = await this.repository.findByUser(userId);
    return orders.filter(o => o.status === OrderStatus.NEW || o.status === OrderStatus.PARTIALLY_FILLED);
  }
}
