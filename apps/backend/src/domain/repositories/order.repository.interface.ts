import { Order } from '../entities/order.entity';
import { OrderStatus } from '../value-objects/order-types';

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string, limit?: number): Promise<Order[]>;
  findActiveByExchangeAccount(exchangeAccountId: string): Promise<Order[]>;
  save(order: Order): Promise<Order>;
  updateStatus(id: string, status: OrderStatus, filledQuantity?: number, avgFillPrice?: number): Promise<void>;
  delete(id: string): Promise<void>;
}