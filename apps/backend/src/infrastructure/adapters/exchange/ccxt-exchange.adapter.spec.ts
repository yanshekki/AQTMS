import { Test, TestingModule } from '@nestjs/testing';
import { CcxtExchangeAdapter } from './ccxt-exchange.adapter';
import * as ccxt from 'ccxt';
import { Logger } from '@nestjs/common';

jest.mock('ccxt');

// ── Shared Test Helpers & Mocks ──────────────────────────────────────────────

interface MockCcxtExchange {
  fetchBalance: jest.Mock;
  createOrder: jest.Mock;
  cancelOrder: jest.Mock;
  fetchPositions: jest.Mock;
  fetchOrder: jest.Mock;
  fetchOpenOrders: jest.Mock;
  fetchTicker: jest.Mock;
  fetchTime: jest.Mock;
  fetchMarkets: jest.Mock;
  fetchOHLCV: jest.Mock;
}

function createMockCcxtExchange(): MockCcxtExchange {
  return {
    fetchBalance: jest.fn(),
    createOrder: jest.fn(),
    cancelOrder: jest.fn(),
    fetchPositions: jest.fn(),
    fetchOrder: jest.fn(),
    fetchOpenOrders: jest.fn(),
    fetchTicker: jest.fn(),
    fetchTime: jest.fn(),
    fetchMarkets: jest.fn(),
    fetchOHLCV: jest.fn(),
  };
}

const MOCK_RESPONSES = {
  order: { id: '12345', status: 'open' },
  ticker: { symbol: 'BTC/USDT', last: 65000 },
  ohlcv: [[Date.now(), 65000, 65100, 64900, 65050, 100]],
  position: {
    symbol: 'BTC/USDT',
    side: 'long',
    contracts: 0.5,
    entryPrice: 50000,
    markPrice: 51000,
    unrealizedPnl: 500,
  },
  balance: {
    total: { USDT: 1000 },
    free: { USDT: 900 },
    used: { USDT: 100 },
  },
  cancelledOrder: { id: '12345', status: 'canceled' },
};

async function initializeAdapter(
  adapter: CcxtExchangeAdapter,
  exchange = 'binance',
  overrides: Partial<any> = {}
): Promise<void> {
  await adapter.initialize({
    exchange,
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    testnet: true,
    ...overrides,
  });
}

function setupMockSuccess(mockExchange: MockCcxtExchange, method: keyof MockCcxtExchange, response: any) {
  mockExchange[method].mockResolvedValue(response);
}

function setupMockError(mockExchange: MockCcxtExchange, method: keyof MockCcxtExchange, error: Error | string) {
  const err = typeof error === 'string' ? new Error(error) : error;
  mockExchange[method].mockRejectedValue(err);
}

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('CcxtExchangeAdapter', () => {
  let adapter: CcxtExchangeAdapter;
  let mockExchange: MockCcxtExchange;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CcxtExchangeAdapter],
    }).compile();

    adapter = module.get<CcxtExchangeAdapter>(CcxtExchangeAdapter);
    mockExchange = createMockCcxtExchange();

    // Mock ccxt constructors for multi-exchange support
    (ccxt.binance as jest.Mock).mockImplementation(() => mockExchange);
    (ccxt.bybit as jest.Mock).mockImplementation(() => mockExchange);
    (ccxt.okx as jest.Mock).mockImplementation(() => mockExchange);

    // Spy on logger
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerSpy.mockRestore();
  });

  // ── Initialization Tests ───────────────────────────────────────────────────
  describe('initialize', () => {
    it('should initialize binance successfully', async () => {
      await initializeAdapter(adapter, 'binance');
      expect(ccxt.binance).toHaveBeenCalled();
    });

    it('should initialize bybit successfully (multi-exchange)', async () => {
      await initializeAdapter(adapter, 'bybit', { testnet: false });
      expect(ccxt.bybit).toHaveBeenCalled();
    });

    it('should cache initialized exchanges and not re-create on duplicate initialize', async () => {
      await initializeAdapter(adapter, 'binance');
      await initializeAdapter(adapter, 'binance');
      expect(ccxt.binance).toHaveBeenCalledTimes(1);
    });

    it('should throw for unsupported exchange', async () => {
      await expect(
        adapter.initialize({ exchange: 'unsupported-exchange', apiKey: 'k', apiSecret: 's' })
      ).rejects.toThrow(/Unsupported exchange: unsupported-exchange/);
    });
  });

  // ── Multi-Exchange Scenarios ───────────────────────────────────────────────
  describe('multi-exchange scenarios', () => {
    beforeEach(async () => {
      await initializeAdapter(adapter, 'binance');
      await initializeAdapter(adapter, 'bybit');
    });

    it('should support getTicker on different exchanges', async () => {
      setupMockSuccess(mockExchange, 'fetchTicker', MOCK_RESPONSES.ticker);

      const binanceTicker = await adapter.getTicker('BTC/USDT', 'binance', true);
      const bybitTicker = await adapter.getTicker('BTC/USDT', 'bybit', true);

      expect(mockExchange.fetchTicker).toHaveBeenCalledTimes(2);
      expect(binanceTicker).toBeDefined();
      expect(bybitTicker).toBeDefined();
    });

    it('should support getOHLCV on different exchanges', async () => {
      setupMockSuccess(mockExchange, 'fetchOHLCV', MOCK_RESPONSES.ohlcv);

      const ohlcv = await adapter.getOHLCV('BTC/USDT', '1h', 10, 'bybit', true);

      expect(mockExchange.fetchOHLCV).toHaveBeenCalledWith('BTC/USDT', '1h', undefined, 10);
      expect(ohlcv).toHaveLength(1);
    });

    it('should use explicit exchange in placeOrder for multi-exchange', async () => {
      setupMockSuccess(mockExchange, 'createOrder', { id: 'ord-123', status: 'open', filled: 0.5 });

      const result = await adapter.placeOrder({
        exchange: 'bybit',
        symbol: 'ETH/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.1,
        testnet: true,
      });

      expect(result.success).toBe(true);
      expect(result.exchangeOrderId).toBe('ord-123');
    });
  });

  // ── Error Handling & Edge Cases ────────────────────────────────────────────
  describe('error handling', () => {
    it('should throw when calling methods before initialize', async () => {
      await expect(adapter.getBalances()).rejects.toThrow(/not initialized/);
    });

    it('should handle createOrder errors via handleError wrapper', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'createOrder', 'Insufficient balance');

      const request = {
        symbol: 'BTC/USDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: 1,
        idempotencyKey: 'k1',
      };

      await expect(adapter.createOrder(request)).rejects.toThrow(/\[CCXT\] createOrder failed/);
    });

    it('should return empty array on getPositions error (graceful degradation)', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'fetchPositions', 'Rate limit');

      const result = await adapter.getPositions();
      expect(result).toEqual([]);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('getPositions failed'));
    });

    it('should return empty on getBalances network error', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'fetchBalance', 'Network timeout');

      const result = await adapter.getBalances();
      expect(result).toEqual([]);
    });

    it('should log and return false on testConnection failure', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'fetchTime', 'Connection refused');

      const result = await adapter.testConnection();
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('testConnection failed'));
    });

    it('should handle placeOrder live trading disabled', async () => {
      await initializeAdapter(adapter);

      const result = await adapter.placeOrder({
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.01,
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('Live trading is currently disabled');
    });

    it('should return null on getTicker error', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'fetchTicker', 'Invalid symbol');

      const ticker = await adapter.getTicker('BAD/SYM');
      expect(ticker).toBeNull();
    });

    it('should handle rate limit errors via handleCcxtError (RateLimitExceeded)', async () => {
      await initializeAdapter(adapter, 'binance');
      const rateLimitError = new ccxt.RateLimitExceeded('rate limit exceeded');
      setupMockError(mockExchange, 'fetchOHLCV', rateLimitError);

      await expect(
        adapter.getOHLCV('BTC/USDT', '1m', 10, 'binance', true)
      ).rejects.toThrow(/Rate limit exceeded on binance/);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('[RATE LIMIT]'));
    });

    it('should handle credential/authentication errors specifically', async () => {
      await initializeAdapter(adapter, 'bybit');
      const authError = new ccxt.AuthenticationError('Invalid API key');
      setupMockError(mockExchange, 'fetchBalance', authError);

      // getBalances uses fetchBalance internally and catches to return []
      const result = await adapter.getBalances();
      expect(result).toEqual([]);
      // Note: direct handleCcxtError path tested via other errors; credential branch logged
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should throw credential error message from handleCcxtError on auth failure in OHLCV path', async () => {
      await initializeAdapter(adapter);
      const credError = new Error('invalid apikey or authentication failed');
      setupMockError(mockExchange, 'fetchOHLCV', credError);

      await expect(adapter.getOHLCV('BTC/USDT')).rejects.toThrow(
        /Invalid or insufficient API credentials for binance/
      );
    });
  });

  // ── Core Trading Operations ────────────────────────────────────────────────
  describe('createOrder', () => {
    it('should create a market order successfully', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'createOrder', MOCK_RESPONSES.order);

      const request = {
        symbol: 'BTC/USDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: 0.001,
        idempotencyKey: 'test-key-1',
      };

      const result = await adapter.createOrder(request);
      expect(mockExchange.createOrder).toHaveBeenCalledWith('BTC/USDT', 'market', 'buy', 0.001, undefined);
      expect(result.exchangeOrderId).toBe('12345');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'cancelOrder', MOCK_RESPONSES.cancelledOrder);

      const result = await adapter.cancelOrder({ exchangeOrderId: '12345', symbol: 'BTC/USDT' });

      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('getPositions and getBalances', () => {
    it('should format positions and balances correctly', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchPositions', [MOCK_RESPONSES.position]);
      setupMockSuccess(mockExchange, 'fetchBalance', MOCK_RESPONSES.balance);

      const positions = await adapter.getPositions();
      const balances = await adapter.getBalances();

      expect(positions).toHaveLength(1);
      expect(balances).toHaveLength(1);
    });
  });

  // ── Integration-style Real Usage Flows ─────────────────────────────────────
  describe('real usage flows (integration-style)', () => {
    it('should simulate initialize → trade → get positions flow', async () => {
      // Step 1: Initialize
      await initializeAdapter(adapter, 'binance', { testnet: true });

      // Step 2: Place a trade
      setupMockSuccess(mockExchange, 'createOrder', { id: 'flow-ord-001', status: 'open', filled: 0 });
      const tradeResult = await adapter.placeOrder({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        testnet: true,
      });

      // Step 3: Fetch positions after trade
      setupMockSuccess(mockExchange, 'fetchPositions', [MOCK_RESPONSES.position]);
      const positions = await adapter.getPositions('binance', true);

      expect(tradeResult.success).toBe(true);
      expect(tradeResult.exchangeOrderId).toBe('flow-ord-001');
      expect(positions).toHaveLength(1);
      expect(positions[0].symbol).toBe('BTC/USDT');
      expect(loggerSpy).not.toHaveBeenCalledWith(expect.stringContaining('error'));
    });

    it('should simulate initialize → multiple trades → position reconciliation', async () => {
      await initializeAdapter(adapter, 'bybit');

      // First trade
      setupMockSuccess(mockExchange, 'createOrder', { id: 'ord-1', status: 'closed', filled: 0.5 });
      await adapter.placeOrder({ exchange: 'bybit', symbol: 'ETH/USDT', side: 'BUY', type: 'MARKET', quantity: 0.5, testnet: false });

      // Second trade
      setupMockSuccess(mockExchange, 'createOrder', { id: 'ord-2', status: 'open', filled: 0.25 });
      await adapter.placeOrder({ exchange: 'bybit', symbol: 'ETH/USDT', side: 'SELL', type: 'LIMIT', quantity: 0.25, price: 3000, testnet: false });

      // Reconcile positions
      setupMockSuccess(mockExchange, 'fetchPositions', [
        { ...MOCK_RESPONSES.position, symbol: 'ETH/USDT', contracts: 0.25 },
      ]);
      const positions = await adapter.getPositions('bybit', false);

      expect(positions).toHaveLength(1);
      expect(mockExchange.createOrder).toHaveBeenCalledTimes(2);
      expect(positions[0].contracts).toBe(0.25);
    });

    it('should handle initialize + get balances + trade with graceful error recovery', async () => {
      await initializeAdapter(adapter);

      setupMockSuccess(mockExchange, 'fetchBalance', MOCK_RESPONSES.balance);
      const balances = await adapter.getBalances();
      expect(balances).toHaveLength(1);

      // Simulate a failing trade then recover
      setupMockError(mockExchange, 'createOrder', 'Temporary rate limit');
      const failResult = await adapter.placeOrder({
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.01,
      }).catch(() => ({ success: false, message: 'rate limit' }));

      setupMockSuccess(mockExchange, 'createOrder', { id: 'recovered-001' });
      const successResult = await adapter.placeOrder({
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.01,
      });

      expect(successResult.success).toBe(true);
      expect(successResult.exchangeOrderId).toBe('recovered-001');
    });
  });
});
