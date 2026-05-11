import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IOrderRepository } from '../../domain/repositories/order.repository';
import { Order } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/value-objects/order-status.vo';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) return null;
    return this.mapToEntity(order);
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({ where: { userId } });
    return orders.map(this.mapToEntity);
  }

  async findOpenByExchangeAccountId(exchangeAccountId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        exchangeAccountId,
        status: { in: ['PENDING', 'PARTIALLY_FILLED'] },
      },
    });
    return orders.map(this.mapToEntity);
  }

  async save(order: Order): Promise<Order> {
    const created = await this.prisma.order.create({
      data: this.mapToPrisma(order),
    });
    return this.mapToEntity(created);
  }

  async update(order: Order): Promise<Order> {
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: this.mapToPrisma(order),
    });
    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.order.delete({ where: { id } });
  }

  private mapToEntity(prismaOrder: any): Order {
    return new Order({
      id: prismaOrder.id,
      userId: prismaOrder.userId,
      exchangeAccountId: prismaOrder.exchangeAccountId,
      symbol: prismaOrder.symbol,
      side: prismaOrder.side,
      type: prismaOrder.type,
      quantity: prismaOrder.quantity,
      price: prismaOrder.price,
      stopLoss: prismaOrder.stopLoss,
      takeProfit: prismaOrder.takeProfit,
      status: prismaOrder.status as OrderStatus,
      isPaper: prismaOrder.isPaper,
      filledQuantity: prismaOrder.filledQuantity,
      avgFillPrice: prismaOrder.avgFillPrice,
      exchangeOrderId: prismaOrder.exchangeOrderId,
      createdAt: prismaOrder.createdAt,
      updatedAt: prismaOrder.updatedAt,
    });
  }

  private mapToPrisma(order: Order): any {
    return {
      id: order.id || undefined,
      userId: order.userId,
      exchangeAccountId: order.exchangeAccountId,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.price,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      status: order.status,
      isPaper: order.isPaper,
      filledQuantity: order.filledQuantity,
      avgFillPrice: order.avgFillPrice,
      exchangeOrderId: order.exchangeOrderId,
    };
  }
}
