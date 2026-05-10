import { Injectable, Logger } from '@nestjs/common';
import { ExecutionService } from '../execution/execution.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private executionService: ExecutionService,
    private prisma: PrismaService,
  ) {}

  async createOrder(orderData: any) {
    this.logger.log('Creating order via OrderService');
    return this.executionService.executeOrder(orderData);
  }
}