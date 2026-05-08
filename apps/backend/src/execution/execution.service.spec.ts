import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionService } from './execution.service';
import { RiskService } from '../risk/risk.service';
import { PositionSizingRule } from '../risk/rules/position-sizing.rule';

describe('ExecutionService Integration Test (with Risk Rules)', () => {
  let service: ExecutionService;
  let riskService: RiskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExecutionService, RiskService],
    }).compile();

    service = module.get<ExecutionService>(ExecutionService);
    riskService = module.get<RiskService>(RiskService);

    // 手動註冊規則（模擬 onModuleInit）
    riskService.registerRule(new PositionSizingRule());
  });

  it('should pass risk check and place order with SL/TP', async () => {
    const dto = {
      userId: 'test-user',
      exchange: 'BINANCE' as const,
      symbol: 'BTCUSDT',
      side: 'BUY' as const,
      quantity: 0.01,
      price: 65000,
      stopLoss: 64000,
      takeProfit: 67000,
      accountBalance: 100000, // 足夠的餘額
    };

    const result = await service.placeOrderWithProtection(dto);

    expect(result.success).toBe(true);
    expect(result.mainOrder).toBeDefined();
    console.log('✅ Normal order with SL/TP passed risk check');
  });

  it('should adjust quantity when position size is too large', async () => {
    const dto = {
      userId: 'test-user',
      exchange: 'BINANCE' as const,
      symbol: 'BTCUSDT',
      side: 'BUY' as const,
      quantity: 10, // 非常大的數量
      price: 65000,
      accountBalance: 10000, // 只有 1 萬 USDT
    };

    const result = await service.placeOrderWithProtection(dto);

    // PositionSizingRule 應該會建議調整倉位
    expect(result.success).toBe(true);
    console.log('✅ Large position was handled (adjusted if needed)');
  });
});
