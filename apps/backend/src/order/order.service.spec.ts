import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { OrderStatus } from './interfaces/order-status.enum';
import { IOrderRepository } from './interfaces/order.repository';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: IOrderRepository;

  beforeEach(async () => {
    const mockRepository: Partial<IOrderRepository> = {
      create: jest.fn().mockImplementation((data) => ({
        id: 'order-123',
        ...data,
        status: OrderStatus.NEW,
        filledQuantity: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findById: jest.fn(),
      findByExchangeOrderId: jest.fn(),
      update: jest.fn().mockImplementation((id, data) => ({
        id,
        ...data,
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: 'ORDER_REPOSITORY',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get<IOrderRepository>('ORDER_REPOSITORY');
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
    (orderRepository.findById as jest.Mock).mockResolvedValue({
      id: 'order-123',
      quantity: 2,
      filledQuantity: 0,
      avgFillPrice: 0,
      status: OrderStatus.NEW,
    });

    const updated1 = await service.applyPartialFill('order-123', 1, 50000);
    expect(updated1?.filledQuantity).toBe(1);
    expect(updated1?.avgFillPrice).toBe(50000);

    (orderRepository.findById as jest.Mock).mockResolvedValue({
      id: 'order-123',
      quantity: 2,
      filledQuantity: 1,
      avgFillPrice: 50000,
      status: OrderStatus.PARTIALLY_FILLED,
    });

    const updated2 = await service.applyPartialFill('order-123', 1, 51000);
    expect(updated2?.filledQuantity).toBe(2);
    expect(updated2?.avgFillPrice).toBe(50500);
    expect(updated2?.status).toBe(OrderStatus.FILLED);
  });

  it('should update order status', async () => {
    const result = await service.updateOrderStatus('order-123', OrderStatus.FILLED);
    expect(result?.status).toBe(OrderStatus.FILLED);
  });
});
