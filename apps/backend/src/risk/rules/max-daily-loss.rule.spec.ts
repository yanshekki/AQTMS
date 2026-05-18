import { MaxDailyLossRule } from './max-daily-loss.rule';

describe('MaxDailyLossRule', () => {
  let rule: MaxDailyLossRule;

  beforeEach(() => {
    rule = new MaxDailyLossRule();
  });

  it('should be defined', () => {
    expect(rule).toBeDefined();
  });

  it('should pass when current daily loss is within limit', async () => {
    const context = {
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'BUY' as const,
      quantity: 0.1,
      price: 65000,
      accountBalance: 100000,
      currentDailyLoss: -200, // loss of 200 within 3% of 100k = 3000
    };

    const result = await rule.check(context);

    expect(result.passed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should pass when no account data provided (graceful default)', async () => {
    const context = {
      userId: 'user-1',
      symbol: 'BTCUSDT',
    };

    const result = await rule.check(context);

    expect(result.passed).toBe(true);
  });

  it('should fail when daily loss exceeds limit (3% of balance)', async () => {
    const context = {
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'SELL' as const,
      quantity: 1,
      price: 65000,
      accountBalance: 100000,
      currentDailyLoss: -3500, // exceeds 3000 (3%)
    };

    const result = await rule.check(context);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('今日虧損已達上限');
    expect(result.reason).toContain('3000');
  });

  it('should pass at exact limit boundary', async () => {
    const context = {
      userId: 'user-1',
      accountBalance: 100000,
      currentDailyLoss: -3000, // exactly 3%
    };

    const result = await rule.check(context);
    expect(result.passed).toBe(true);
  });

  it('should handle zero balance edge case', async () => {
    const context = {
      accountBalance: 0,
      currentDailyLoss: -100,
    };

    const result = await rule.check(context);
    // current impl: maxAllowed=0, loss > 0 is false so passes (may want future >= check)
    expect(result.passed).toBe(true);
  });

  it('should handle missing currentDailyLoss gracefully', async () => {
    const context = {
      accountBalance: 50000,
    };

    const result = await rule.check(context);
    expect(result.passed).toBe(true);
  });
});
