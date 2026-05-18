import { MaxOpenPositionsRule } from './max-open-positions.rule';

describe('MaxOpenPositionsRule', () => {
  let rule: MaxOpenPositionsRule;

  beforeEach(() => {
    rule = new MaxOpenPositionsRule();
  });

  it('should be defined', () => {
    expect(rule).toBeDefined();
  });

  it('should pass when current open positions are within limit', async () => {
    const context: any = {
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      side: 'BUY' as const,
      quantity: 0.1,
      price: 65000,
      currentOpenPositions: 3,
      maxOpenPositions: 5,
    };

    const result = await rule.check(context);

    expect(result.passed).toBe(true);
  });

  it('should fail when user already has maximum open positions', async () => {
    const context: any = {
      userId: 'user-1',
      exchange: 'BINANCE',
      symbol: 'ETHUSDT',
      side: 'BUY' as const,
      quantity: 1,
      price: 3000,
      currentOpenPositions: 5,
      maxOpenPositions: 5,
    };

    const result = await rule.check(context);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('最大持倉數量');
  });
});
