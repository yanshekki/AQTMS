import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionService } from './execution.service';
import { RiskService } from '../risk/risk.service';

describe('ExecutionService (Phase 2.1)', () => {
  let service: ExecutionService;
  let riskService: RiskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExecutionService, RiskService],
    }).compile();

    service = module.get<ExecutionService>(ExecutionService);
    riskService = module.get<RiskService>(RiskService);
  });

  it('should place order with Stop Loss and Take Profit (mock)', async () => {
    const dto = {
      userId: 'test-user-123',
      exchange: 'BINANCE' as const,
      symbol: 'BTCUSDT',
      side: 'BUY' as const,
      quantity: 0.01,
      price: 65000,
      stopLoss: 64000,
      takeProfit: 67000,
      orderType: 'LIMIT' as const,
    };

    const result = await service.placeOrderWithProtection(dto);

    expect(result.success).toBe(true);
    expect(result.mainOrder).toBeDefined();
    expect(result.stopLossOrder).toBeDefined();
    expect(result.takeProfitOrder).toBeDefined();

    console.log('✅ Mock test passed:', result);
  });
});
