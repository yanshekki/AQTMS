import { Test, TestingModule } from '@nestjs/testing';
// ... other imports ...

describe('ExecutionService - WebSocket Updates', () => {
  let service: ExecutionService;
  let orderService: OrderService;
  let websocketService: WebsocketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionService,
        // ... mock other dependencies ...
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
            findByExchangeOrderId: jest.fn(),
            applyPartialFill: jest.fn(),
            updateOrderStatus: jest.fn(),
          },
        },
        // ... other mocks ...
      ],
    }).compile();

    service = module.get<ExecutionService>(ExecutionService);
    orderService = module.get<OrderService>(OrderService);
    websocketService = module.get<WebsocketService>(WebsocketService);
  });

  it('should start listening to order updates via WebSocket', async () => {
    const binanceClient = websocketService.getBinanceClient();

    await service.startListeningToOrderUpdates();

    expect(binanceClient.connectUserStream).toHaveBeenCalled();
    expect(binanceClient.onMessage).toHaveBeenCalled();
  });

  it('should call findByExchangeOrderId and applyPartialFill when receiving executionReport', async () => {
    // 模擬已經有本地訂單
    jest.spyOn(orderService, 'findByExchangeOrderId').mockResolvedValue({
      id: 'local-order-123',
      filledQuantity: 0,
    } as any);

    // 直接呼叫私有方法進行測試（實際專案可考慮改為 protected 或使用其他方式）
    const report = {
      e: 'executionReport',
      s: 'BTCUSDT',
      S: 'BUY',
      X: 'PARTIALLY_FILLED',
      z: '0.5',
      L: '65000',
      i: 'exchange-order-456',
      x: 'TRADE',
    };

    // @ts-ignore - 測試用
    await service['handleExecutionReport'](report);

    expect(orderService.findByExchangeOrderId).toHaveBeenCalledWith('exchange-order-456');
    expect(orderService.applyPartialFill).toHaveBeenCalled();
  });
});
