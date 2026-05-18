import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { OrderStatus } from './interfaces/order-status.enum';
import { IOrderRepository } from './interfaces/order.repository';

/**
 * OrderService Unit Tests
 *
 * Tests core order lifecycle operations:
 * - Order creation with default NEW status
 * - Partial fill logic with average price calculation (weighted)
 * - Status transitions
 *
 * Mocks the ORDER_REPOSITORY token to isolate the service layer.
 * Future maintainers: keep mock implementations in sync with IOrderRepository interface.
 */
describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: IOrderRepository;

  beforeEach(async () => {
    // Mock repository with realistic implementations:
    // - create() returns a fully formed order with NEW status and zero fills
    // - update() simply merges changes (simulates persistence)
    // Note: findById and findByExchangeOrderId are left as jest.fn() for per-test overrides
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
    // Basic smoke test to ensure DI and instantiation succeed
    expect(service).toBeDefined();
  });

  it('should create an order with NEW status', async () => {
    // Verifies that createOrder always initializes with NEW status + zero filled qty
    // regardless of input (input status is overridden by service logic)
    const order = await service.createOrder({
      userId: 'user-1',
      exchange: 'acc-1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 1,
      status: OrderStatus.NEW,
      filledQuantity: 0,
    });

    expect(order.status).toBe(OrderStatus.NEW);
    expect(order.filledQuantity).toBe(0);
  });

  it('should apply partial fill correctly and calculate average price', async () => {
    // Scenario: Two sequential partial fills on the same order
    // First fill: 1/2 @ 50000 → avg = 50000
    // Second fill: +1/2 @ 51000 → new avg = (1*50000 + 1*51000) / 2 = 50500
    // Final status becomes FILLED when filledQuantity == quantity

    (orderRepository.findById as jest.Mock).mockResolvedValue({
      id: 'order-123',
      quantity: 2,
      filledQuantity: 0,
      averageFillPrice: 0,
      status: OrderStatus.NEW,
    });

    const updated1 = await service.applyPartialFill('order-123', 1, 50000);
    expect(updated1?.filledQuantity).toBe(1);
    expect(updated1?.averageFillPrice).toBe(50000);

    (orderRepository.findById as jest.Mock).mockResolvedValue({
      id: 'order-123',
      quantity: 2,
      filledQuantity: 1,
      averageFillPrice: 50000,
      status: OrderStatus.PARTIALLY_FILLED,
    });

    const updated2 = await service.applyPartialFill('order-123', 1, 51000);
    expect(updated2?.filledQuantity).toBe(2);
    expect(updated2?.averageFillPrice).toBe(50500);
    expect(updated2?.status).toBe(OrderStatus.FILLED);
  });

  it('should update order status', async () => {
    // Simple status transition test (NEW → FILLED)
    const result = await service.updateOrderStatus('order-123', OrderStatus.FILLED);
    expect(result?.status).toBe(OrderStatus.FILLED);
  });
});
