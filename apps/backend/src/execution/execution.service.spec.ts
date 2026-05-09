import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionService } from './execution.service';
import { RiskService } from '../risk/risk.service';
import { KillSwitchService } from '../safety/kill-switch.service';
import { OrderService } from '../order/order.service';
import { ExecutionLoggerService } from './execution-logger.service';
import { ExecutionMetricsCollector } from './metrics-collector.service';
import { ExchangeService } from '../exchange/exchange.service';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { PositionSizingRule } from '../risk/rules/position-sizing.rule';

describe('ExecutionService', () => {
  let service: ExecutionService;
  let riskService: RiskService;
  let killSwitchService: KillSwitchService;
  let metricsCollector: ExecutionMetricsCollector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionService,
        {
          provide: RiskService,
          useValue: {
            check: jest.fn().mockResolvedValue({ passed: true }),
            registerRule: jest.fn(),
          },
        },
        {
          provide: KillSwitchService,
          useValue: {
            isTradingAllowed: jest.fn().mockResolvedValue({ allowed: true }),
          },
        },
        {
          provide: OrderService,
          useValue: {
            createOrder: jest.fn().mockResolvedValue({ id: 'order-123' }),
            updateOrderStatus: jest.fn(),
          },
        },
        {
          provide: ExecutionLoggerService,
          useValue: {
            logPlacement: jest.fn(),
            logError: jest.fn(),
          },
        },
        {
          provide: ExecutionMetricsCollector,
          useValue: {
            recordOrder: jest.fn(),
            recordRetry: jest.fn(),
          },
        },
        {
          provide: ExchangeService,
          useValue: {
            placeOrder: jest.fn().mockResolvedValue({
              orderId: 'ex-123',
              status: 'FILLED',
              filledQuantity: 1,
            }),
          },
        },
        {
          provide: PaperTradingService,
          useValue: {
            placePaperOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExecutionService>(ExecutionService);
    riskService = module.get<RiskService>(RiskService);
    killSwitchService = module.get<KillSwitchService>(KillSwitchService);
    metricsCollector = module.get<ExecutionMetricsCollector>(ExecutionMetricsCollector);

    riskService.registerRule(new PositionSizingRule());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should block order when Kill Switch is active', async () => {
    jest.spyOn(killSwitchService, 'isTradingAllowed').mockResolvedValue({
      allowed: false,
      reason: 'Kill switch active',
    });

    await expect(
      service.placeOrderWithProtection({
        userId: 'user-1',
        exchange: 'BINANCE',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: 1,
        isPaperTrading: false,
      } as any)
    ).rejects.toThrow('交易已停止');
  });

  it('should reject order when risk check fails', async () => {
    jest.spyOn(riskService, 'check').mockResolvedValue({ passed: false, reason: 'Risk check failed' });

    await expect(
      service.placeOrderWithProtection({
        userId: 'user-1',
        exchange: 'BINANCE',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: 1,
        isPaperTrading: false,
      } as any)
    ).rejects.toThrow('風險檢查未通過');
  });

  it('should successfully place live order and record metrics', async () => {
    const result = await service.placeOrderWithProtection({
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: 0.01,
      isPaperTrading: false,
    } as any);

    expect(result.success).toBe(true);
    expect(result.mode).toBe('LIVE');
    expect(metricsCollector.recordOrder).toHaveBeenCalledWith(true);
  });

  it('should use Paper Trading path when isPaperTrading is true', async () => {
    const paperTradingService = module.get<PaperTradingService>(PaperTradingService);
    const spy = jest.spyOn(paperTradingService, 'placePaperOrder');

    await service.placeOrderWithProtection({
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: 0.01,
      isPaperTrading: true,
    } as any);

    expect(spy).toHaveBeenCalled();
  });
});
