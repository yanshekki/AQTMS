import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaOrderRepository } from './repositories/prisma-order.repository';

@Module({
  providers: [
    OrderService,
    {
      provide: 'ORDER_REPOSITORY',
      useClass: PrismaOrderRepository,
    },
  ],
  exports: [OrderService],
})
export class OrderModule {}
