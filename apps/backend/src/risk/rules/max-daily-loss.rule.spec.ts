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
      currentDailyPnl: -200, // 已虧 200
      dailyLossLimit: 1000,
    };

    const result = await rule.check(context);

    expect(result.passed).toBe(true);
  });

  it('should fail when adding this trade would exceed daily loss limit', async () => {
    const context = {
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'SELL' as const,
      quantity: 1,
      price: 65000,
      currentDailyPnl: -800,
      dailyLossLimit: 1000,
      estimatedPnl: -300, // 預估再虧 300
    };

    const result = await rule.check(context);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('每日虧損限制');
  });
});
