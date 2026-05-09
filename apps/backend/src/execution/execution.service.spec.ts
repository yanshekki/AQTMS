import { Test, TestingModule } from '@nestjs/testing';
// ... other imports and mocks ...

describe('ExecutionService + ExchangeService Integration', () => {
  let service: ExecutionService;
  let exchangeService: ExchangeService;
  let orderService: OrderService;
  let metricsCollector: ExecutionMetricsCollector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionService,
        {
          provide: ExchangeService,
          useValue: {
            placeOrder: jest.fn().mockResolvedValue({
              orderId: 'ex-123',
              exchangeOrderId: 'ex-123',
              status: 'FILLED',
              filledQuantity: 1,
              averagePrice: 65000,
            }),
          },
        },
        {
          provide: OrderService,
          useValue: {
            createOrder: jest.fn().mockResolvedValue({ id: 'local-123', filledQuantity: 0 }),
            updateOrderStatus: jest.fn(),
            findByExchangeOrderId: jest.fn(),
          },
        },
        // ... other required mocks ...
      ],
    }).compile();

    service = module.get<ExecutionService>(ExecutionService);
    exchangeService = module.get<ExchangeService>(ExchangeService);
    orderService = module.get<OrderService>(OrderService);
    metricsCollector = module.get<ExecutionMetricsCollector>(ExecutionMetricsCollector);
  });

  it('should call ExchangeService.placeOrder and save exchangeOrderId', async () => {
    await service.placeOrderWithProtection({
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: 0.01,
      isPaperTrading: false,
    } as any);

    expect(exchangeService.placeOrder).toHaveBeenCalled();
    expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Number),
      expect.any(Number),
      'ex-123'
    );
  });

  it('should record success metric on successful order', async () => {
    await service.placeOrderWithProtection({
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: 0.01,
      isPaperTrading: false,
    } as any);

    expect(metricsCollector.recordOrder).toHaveBeenCalledWith(true);
  });
});
