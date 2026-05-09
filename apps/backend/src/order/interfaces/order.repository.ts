import { Order } from './order.entity';

export interface IOrderRepository {
  create(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByUser(userId: string): Promise<Order[]>;
  update(id: string, data: Partial<Order>): Promise<Order>;
}
