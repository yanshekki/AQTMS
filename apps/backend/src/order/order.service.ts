import { Injectable, Inject, Optional } from '@nestjs/common';
import { Order } from './interfaces/order.entity';
import { OrderStatus } from './interfaces/order-status.enum';
import { IOrderRepository } from './interfaces/order.repository';

@Injectable()
export class OrderService {
  // ... existing code ...

  async findByExchangeOrderId(exchangeOrderId: string): Promise<Order | undefined> {
    const order = await this.repository.findByExchangeOrderId(exchangeOrderId);
    return order || undefined;
  }

  // ... existing methods ...
}
