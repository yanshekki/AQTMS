import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { ExecutionModule } from '../execution/execution.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ExecutionModule, PrismaModule],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}