import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { OrderStatus } from './interfaces/order-status.enum';
import { PrismaService } from '../prisma/prisma.service';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an order with NEW status', async () => {
    const order = await service.createOrder({
      userId: 'user-1',
      exchangeAccountId: 'acc-1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 1,
    });

    expect(order.status).toBe(OrderStatus.NEW);
    expect(order.filledQuantity).toBe(0);
  });

  it('should apply partial fill correctly and calculate average price', async () => {
    const order = await service.createOrder({
      userId: 'user-1',
      exchangeAccountId: 'acc-1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      quantity: 2,
      price: 50000,
    });

    const updated1 = await service.applyPartialFill(order.id, 1, 50000);
    expect(updated1.filledQuantity).toBe(1);
    expect(updated1.averageFillPrice).toBe(50000);
    expect(updated1.status).toBe(OrderStatus.PARTIALLY_FILLED);

    const updated2 = await service.applyPartialFill(order.id, 1, 51000);
    expect(updated2.filledQuantity).toBe(2);
    expect(updated2.averageFillPrice).toBe(50500);
    expect(updated2.status).toBe(OrderStatus.FILLED);
  });

  it('should throw error when applying fill to invalid status', async () => {
    const order = await service.createOrder({
      userId: 'user-1',
      exchangeAccountId: 'acc-1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 1,
    });

    await service.updateOrderStatus(order.id, OrderStatus.FILLED);

    await expect(
      service.applyPartialFill(order.id, 0.5, 50000)
    ).rejects.toThrow();
  });

  it('should throw error when fill quantity exceeds remaining', async () => {
    const order = await service.createOrder({
      userId: 'user-1',
      exchangeAccountId: 'acc-1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 1,
    });

    await expect(
      service.applyPartialFill(order.id, 2, 50000)
    ).rejects.toThrow();
  });
});
