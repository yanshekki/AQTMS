import { Injectable } from '@nestjs/common';
import { Order } from '../interfaces/order.entity';
import { OrderStatus } from '../interfaces/order-status.enum';

// import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class PrismaOrderRepository {
  // constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    // const created = await this.prisma.order.create({
    //   data: {
    //     userId: data.userId,
    //     exchange: data.exchange,
    //     symbol: data.symbol,
    //     side: data.side,
    //     type: data.type,
    //     quantity: data.quantity,
    //     price: data.price,
    //     stopPrice: data.stopPrice,
    //     status: data.status,
    //     filledQuantity: data.filledQuantity,
    //     averageFillPrice: data.averageFillPrice,
    //     exchangeOrderId: data.exchangeOrderId,
    //   },
    // });
    // return this.mapToOrder(created);
    console.log('[PrismaOrderRepository] create (TODO)');
    return { ...data, id: 'temp-' + Date.now(), createdAt: new Date(), updatedAt: new Date() } as Order;
  }

  async findById(id: string): Promise<Order | null> {
    // const order = await this.prisma.order.findUnique({ where: { id } });
    // return order ? this.mapToOrder(order) : null;
    console.log('[PrismaOrderRepository] findById (TODO)');
    return null;
  }

  async findByUser(userId: string): Promise<Order[]> {
    // const orders = await this.prisma.order.findMany({ where: { userId } });
    // return orders.map(this.mapToOrder);
    console.log('[PrismaOrderRepository] findByUser (TODO)');
    return [];
  }

  async update(id: string, data: Partial<Order>): Promise<Order> {
    // const updated = await this.prisma.order.update({
    //   where: { id },
    //   data,
    // });
    // return this.mapToOrder(updated);
    console.log('[PrismaOrderRepository] update (TODO)');
    return { ...(data as Order), id, updatedAt: new Date() };
  }

  private mapToOrder(dbOrder: any): Order {
    return {
      id: dbOrder.id,
      userId: dbOrder.userId,
      exchange: dbOrder.exchange,
      symbol: dbOrder.symbol,
      side: dbOrder.side,
      type: dbOrder.type,
      quantity: dbOrder.quantity,
      price: dbOrder.price,
      stopPrice: dbOrder.stopPrice,
      status: dbOrder.status as OrderStatus,
      filledQuantity: dbOrder.filledQuantity,
      averageFillPrice: dbOrder.averageFillPrice,
      createdAt: dbOrder.createdAt,
      updatedAt: dbOrder.updatedAt,
      exchangeOrderId: dbOrder.exchangeOrderId,
    };
  }
}
