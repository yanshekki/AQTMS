import { Test, TestingModule } from '@nestjs/testing';
// ... other imports ...

describe('ExecutionService WebSocket Flow', () => {
  let service: ExecutionService;
  let orderService: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionService,
        {
          provide: WebsocketService,
          useValue: {
            getBinanceClient: jest.fn().mockReturnValue({
              connectUserStream: jest.fn(),
              onMessage: jest.fn(),
            }),
          },
        },
        {
          provide: OrderService,
          useValue: {
            findByExchangeOrderId: jest.fn().mockResolvedValue({
              id: 'local-order-123',
              filledQuantity: 0,
            }),
            applyPartialFill: jest.fn(),
            updateOrderStatus: jest.fn(),
          },
        },
        // ... other mocks ...
      ],
    }).compile();

    service = module.get<ExecutionService>(ExecutionService);
    orderService = module.get<OrderService>(OrderService);
  });

  it('should handle executionReport and update order via applyPartialFill', async () => {
    const fakeReport = {
      e: 'executionReport',
      s: 'BTCUSDT',
      S: 'BUY',
      X: 'PARTIALLY_FILLED',
      z: '0.5',
      L: '65000',
      i: 987654,
      x: 'TRADE',
    };

    // @ts-ignore - testing private method
    await service['handleExecutionReport'](fakeReport);

    expect(orderService.findByExchangeOrderId).toHaveBeenCalledWith('987654');
    expect(orderService.applyPartialFill).toHaveBeenCalled();
  });
});
