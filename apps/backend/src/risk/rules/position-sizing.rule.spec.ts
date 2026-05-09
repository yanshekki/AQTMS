import { PositionSizingRule } from './position-sizing.rule';

describe('PositionSizingRule', () => {
  let rule: PositionSizingRule;

  beforeEach(() => {
    rule = new PositionSizingRule();
  });

  it('should be defined', () => {
    expect(rule).toBeDefined();
  });

  it('should pass when position size is within limit (1% of balance)', async () => {
    const context = {
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'BUY' as const,
      quantity: 0.01,
      price: 65000,
      accountBalance: 100000, // 10萬 USDT
    };

    const result = await rule.check(context);

    expect(result.passed).toBe(true);
  });

  it('should fail when position size exceeds 2% of balance', async () => {
    const context = {
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'BUY' as const,
      quantity: 1, // 很大倉位
      price: 65000,
      accountBalance: 10000, // 只有1萬 USDT
    };

    const result = await rule.check(context);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('倉位過大');
  });

  it('should suggest adjusted quantity when position is too large', async () => {
    const context = {
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'BUY' as const,
      quantity: 0.5,
      price: 65000,
      accountBalance: 10000,
    };

    const result = await rule.check(context);

    expect(result.passed).toBe(false);
    expect(result.adjustedQuantity).toBeDefined();
    expect(result.adjustedQuantity).toBeLessThan(0.5);
  });
});
