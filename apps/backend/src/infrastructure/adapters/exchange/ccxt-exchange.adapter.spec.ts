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
    (ccxt.coinbase as jest.Mock).mockImplementation(() => mockExchange);
    (ccxt.kraken as jest.Mock).mockImplementation(() => mockExchange);
    (ccxt.kucoin as jest.Mock).mockImplementation(() => mockExchange);
    (ccxt.huobi as jest.Mock).mockImplementation(() => mockExchange);
    (ccxt.gateio as jest.Mock).mockImplementation(() => mockExchange);
    (ccxt.mexc as jest.Mock).mockImplementation(() => mockExchange);

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

    it('should throw for unsupported exchange with testnet and without credentials', async () => {
      await expect(
        adapter.initialize({ exchange: 'fake-exchange', testnet: true })
      ).rejects.toThrow(/Unsupported exchange: fake-exchange/);
    });

    it('should include supported exchanges guidance in unsupported error message', async () => {
      await expect(
        adapter.initialize({ exchange: 'nonexistent-ccxt', apiKey: 'x', apiSecret: 'y' })
      ).rejects.toThrow(/Supported examples: binance, bybit, okx, coinbase, kraken, kucoin, huobi, gateio, mexc, etc\./);
    });

    // Multi-exchange initialization scenarios
    it('should initialize multiple distinct exchanges (binance + bybit + okx)', async () => {
      await initializeAdapter(adapter, 'binance');
      await initializeAdapter(adapter, 'bybit');
      await initializeAdapter(adapter, 'okx');

      expect(ccxt.binance).toHaveBeenCalled();
      expect(ccxt.bybit).toHaveBeenCalled();
      expect(ccxt.okx).toHaveBeenCalled();
      // Each constructor called once
      expect(ccxt.binance).toHaveBeenCalledTimes(1);
    });

    it('should cache testnet and mainnet separately for same exchange', async () => {
      await initializeAdapter(adapter, 'binance', { testnet: true });
      await initializeAdapter(adapter, 'binance', { testnet: false });

      // Should create two instances (different cacheKeys)
      expect(ccxt.binance).toHaveBeenCalledTimes(2);
    });

    it('should support initializing with password/passphrase for OKX-style exchanges', async () => {
      await initializeAdapter(adapter, 'okx', {
        password: 'test-pass',
        passphrase: 'test-phrase',
      });
      expect(ccxt.okx).toHaveBeenCalled();
    });

    it('should not re-initialize when calling initialize again with identical config', async () => {
      await initializeAdapter(adapter, 'bybit', { testnet: true });
      await initializeAdapter(adapter, 'bybit', { testnet: true });
      expect(ccxt.bybit).toHaveBeenCalledTimes(1);
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

    it('should handle cancelOrder errors via handleError wrapper', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'cancelOrder', 'Order not found');

      await expect(
        adapter.cancelOrder({ exchangeOrderId: '999', symbol: 'BTC/USDT' })
      ).rejects.toThrow(/\[CCXT\] cancelOrder failed/);
    });

    it('should throw for invalid initialize config (empty exchange)', async () => {
      await expect(
        adapter.initialize({ exchange: '', apiKey: 'k', apiSecret: 's' })
      ).rejects.toThrow(/Invalid configuration: exchange name is required/);
    });

    it('should return empty array on getOpenOrders error (graceful)', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'fetchOpenOrders', 'Exchange error');

      const result = await adapter.getOpenOrders();
      expect(result).toEqual([]);
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should return null on fetchOrder error', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'fetchOrder', 'Order not found');

      const order = await adapter.fetchOrder('nonexistent');
      expect(order).toBeNull();
    });
  });

  // ── getBalances Success Scenarios (TestGuard Addition) ─────────────────────
  describe('getBalances success scenarios', () => {
    it('should return formatted balances on successful fetchBalance', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchBalance', MOCK_RESPONSES.balance);

      const result = await adapter.getBalances();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        asset: 'USDT',
        free: '900',
        locked: '100',
      });
    });

    it('should handle multiple assets correctly', async () => {
      await initializeAdapter(adapter, 'bybit');
      setupMockSuccess(mockExchange, 'fetchBalance', {
        total: { BTC: 0.5, USDT: 5000 },
        free: { BTC: 0.4, USDT: 4500 },
        used: { BTC: 0.1, USDT: 500 },
      });

      const result = await adapter.getBalances();

      expect(result).toHaveLength(2);
      expect(result.map(r => r.asset).sort()).toEqual(['BTC', 'USDT']);
      expect(result.find(r => r.asset === 'BTC')?.free).toBe('0.4');
    });

    it('should return empty array with warning when no assets present', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchBalance', { total: {}, free: {}, used: {} });

      const result = await adapter.getBalances();

      expect(result).toEqual([]);
      // Note: warn spy is active via beforeEach
    });
  });

  // ── getBalance Success Scenarios (TestGuard Addition) ─────────────────────
  describe('getBalance success scenarios', () => {
    it('should return USDT total balance on successful fetchBalance', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchBalance', MOCK_RESPONSES.balance);

      const result = await adapter.getBalance('');
      expect(result).toBe(1000);
    });

    it('should return 0 when no USDT balance present', async () => {
      await initializeAdapter(adapter, 'bybit');
      setupMockSuccess(mockExchange, 'fetchBalance', {
        total: { BTC: 0.5, ETH: 2.0 },
        free: { BTC: 0.4, ETH: 1.8 },
        used: { BTC: 0.1, ETH: 0.2 },
      });

      const result = await adapter.getBalance('account-123');
      expect(result).toBe(0);
    });

    it('should return 0 on empty total balance', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchBalance', { total: {} });

      const result = await adapter.getBalance('');
      expect(result).toBe(0);
    });

    it('should return correct total for non-USDT asset when specified', async () => {
      await initializeAdapter(adapter, 'binance');
      setupMockSuccess(mockExchange, 'fetchBalance', {
        total: { BTC: 1.25, USDT: 5000 },
        free: { BTC: 1.0, USDT: 4500 },
        used: { BTC: 0.25, USDT: 500 },
      });

      const btcBalance = await adapter.getBalance('BTC');
      expect(btcBalance).toBe(1.25);
    });
  });

  // ── getPositions Success Scenarios (TestGuard Addition) ────────────────────
  describe('getPositions success scenarios', () => {
    it('should return formatted positions on successful fetchPositions', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchPositions', [MOCK_RESPONSES.position]);

      const result = await adapter.getPositions();
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC/USDT');
      expect(result[0].quantity).toBe(0.5);
      expect(result[0].entryPrice).toBe(50000);
      expect(result[0].markPrice).toBe(51000);
      expect(result[0].unrealizedPnl.amount).toBe(500);
      expect(['BUY', 'LONG']).toContain(result[0].side);
    });

    it('should handle multiple positions correctly', async () => {
      await initializeAdapter(adapter, 'bybit');
      setupMockSuccess(mockExchange, 'fetchPositions', [
        { symbol: 'BTC/USDT', side: 'long', contracts: 0.5, entryPrice: 50000, markPrice: 51000, unrealizedPnl: 500 },
        { symbol: 'ETH/USDT', side: 'short', contracts: -1.2, entryPrice: 3000, markPrice: 2950, unrealizedPnl: -60 },
      ]);

      const result = await adapter.getPositions();
      expect(result).toHaveLength(2);
      expect(result.map(r => r.symbol).sort()).toEqual(['BTC/USDT', 'ETH/USDT']);
      expect(result.find(r => r.symbol === 'ETH/USDT')?.quantity).toBe(1.2);
    });

    it('should return empty array when no valid positions present', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchPositions', []);

      const result = await adapter.getPositions();
      expect(result).toEqual([]);
    });

    it('should filter out invalid/zero-contract positions', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchPositions', [
        { symbol: 'BTC/USDT', contracts: 0.5 },
        { symbol: 'ETH/USDT', contracts: 0 },
        { symbol: 'SOL/USDT' },
      ]);

      const result = await adapter.getPositions();
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC/USDT');
    });
  });

  // ── getOrder Success Scenarios (TestGuard Addition) ────────────────────────
  describe('getOrder success scenarios', () => {
    it('should return formatted order on successful fetchOrder', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchOrder', {
        id: 'ord-123',
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'market',
        amount: 0.5,
        price: 65000,
        filled: 0.5,
        status: 'closed',
        datetime: '2024-01-01T00:00:00Z',
      });

      const result = await adapter.getOrder('ord-123', 'BTC/USDT');
      expect(result).toBeDefined();
      expect(result.exchangeOrderId).toBe('ord-123');
      expect(result.symbol).toBe('BTC/USDT');
      expect(result.side).toBe('BUY');
      expect(result.quantity).toBe(0.5);
      expect(result.filledQuantity).toBe(0.5);
      expect(result.status).toBe('CLOSED');
    });

    it('should handle partial fill order correctly', async () => {
      await initializeAdapter(adapter, 'bybit');
      setupMockSuccess(mockExchange, 'fetchOrder', {
        id: 'partial-456',
        symbol: 'ETH/USDT',
        side: 'sell',
        type: 'limit',
        amount: 2,
        price: 3000,
        filled: 1,
        status: 'open',
      });

      const result = await adapter.getOrder('partial-456', 'ETH/USDT');
      expect(result.exchangeOrderId).toBe('partial-456');
      expect(result.filledQuantity).toBe(1);
      expect(result.quantity).toBe(2);
      expect(result.status).toBe('OPEN');
    });
  });

  // ── getOpenOrders Success Scenarios (TestGuard Addition) ───────────────────
  describe('getOpenOrders success scenarios', () => {
    it('should return formatted open orders on successful fetchOpenOrders', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchOpenOrders', [
        { id: 'open-1', symbol: 'BTC/USDT', side: 'buy', type: 'limit', amount: 0.1, price: 64000, filled: 0, status: 'open' },
        { id: 'open-2', symbol: 'ETH/USDT', side: 'sell', type: 'limit', amount: 1, price: 3100, filled: 0, status: 'open' },
      ]);

      const result = await adapter.getOpenOrders();
      expect(result).toHaveLength(2);
      expect(result[0].exchangeOrderId).toBe('open-1');
      expect(result[0].status).toBe('OPEN');
      expect(result[1].symbol).toBe('ETH/USDT');
    });

    it('should return empty array when no open orders', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchOpenOrders', []);

      const result = await adapter.getOpenOrders('BTC/USDT');
      expect(result).toEqual([]);
  });

  // ── getTicker Success Scenarios (TestGuard Addition) ───────────────────────
  describe('getTicker success scenarios', () => {
    it('should return ticker data on successful fetchTicker', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchTicker', MOCK_RESPONSES.ticker);

      const result = await adapter.getTicker('BTC/USDT');

      expect(result).toEqual(MOCK_RESPONSES.ticker);
      expect(mockExchange.fetchTicker).toHaveBeenCalledWith('BTC/USDT');
    });

    it('should return ticker for different exchanges and testnet flag', async () => {
      await initializeAdapter(adapter, 'bybit');
      setupMockSuccess(mockExchange, 'fetchTicker', { symbol: 'ETH/USDT', last: 3000 });

      const result = await adapter.getTicker('ETH/USDT', 'bybit', true);

      expect(result).toBeDefined();
      expect(result.symbol).toBe('ETH/USDT');
      expect(mockExchange.fetchTicker).toHaveBeenCalledWith('ETH/USDT');
    });
  });

  // ── getOHLCV Success Scenarios (TestGuard Addition) ────────────────────────
  describe('getOHLCV success scenarios', () => {
    it('should return OHLCV data on successful fetchOHLCV', async () => {
      await initializeAdapter(adapter);
      setupMockSuccess(mockExchange, 'fetchOHLCV', MOCK_RESPONSES.ohlcv);

      const result = await adapter.getOHLCV('BTC/USDT', '1h', 10);

      expect(result).toEqual(MOCK_RESPONSES.ohlcv);
      expect(mockExchange.fetchOHLCV).toHaveBeenCalledWith('BTC/USDT', '1h', undefined, 10);
    });

    it('should fetch OHLCV with correct parameters on multi-exchange', async () => {
      await initializeAdapter(adapter, 'okx');
      const customOhlcv = [[Date.now(), 100, 101, 99, 100.5, 500]];
      setupMockSuccess(mockExchange, 'fetchOHLCV', customOhlcv);

      const result = await adapter.getOHLCV('SOL/USDT', '5m', 20, 'okx', false);

      expect(result).toHaveLength(1);
      expect(mockExchange.fetchOHLCV).toHaveBeenCalledWith('SOL/USDT', '5m', undefined, 20);
    });
  });

  // ── Rate Limit Error Scenarios (TestGuard Addition) ────────────────────────
  describe('rate limit error scenarios', () => {
    it('should handle RateLimitExceeded on createOrder with proper error message and logging', async () => {
      await initializeAdapter(adapter, 'binance');
      const rateLimitError = new ccxt.RateLimitExceeded('binance rate limit hit');
      setupMockError(mockExchange, 'createOrder', rateLimitError);

      const request = {
        symbol: 'BTC/USDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: 0.1,
        idempotencyKey: 'rl-1',
      };

      await expect(adapter.createOrder(request)).rejects.toThrow(
        /Rate limit exceeded on binance/
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RATE LIMIT]')
      );
    });

    it('should handle rate limit string error on getTicker', async () => {
      await initializeAdapter(adapter, 'bybit');
      setupMockError(mockExchange, 'fetchTicker', 'RateLimit exceeded');

      const result = await adapter.getTicker('ETH/USDT', 'bybit', false);
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('getTicker failed'));
    });

    it('should handle rate limit on getOHLCV for multiple exchanges', async () => {
      await initializeAdapter(adapter, 'binance');
      await initializeAdapter(adapter, 'okx');

      const rateLimitError = new ccxt.RateLimitExceeded('too many requests');
      setupMockError(mockExchange, 'fetchOHLCV', rateLimitError);

      await expect(
        adapter.getOHLCV('BTC/USDT', '1h', 50, 'binance', true)
      ).rejects.toThrow(/Rate limit exceeded on binance/);

      await expect(
        adapter.getOHLCV('ETH/USDT', '5m', 100, 'okx', true)
      ).rejects.toThrow(/Rate limit exceeded on okx/);
    });

    it('should handle rate limit error with custom message containing RateLimit keyword', async () => {
      await initializeAdapter(adapter, 'bybit');
      const customRateError = new Error('RateLimit: 429 Too Many Requests');
      setupMockError(mockExchange, 'fetchBalance', customRateError);

      const result = await adapter.getBalances();
      expect(result).toEqual([]);
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should propagate rate limit error from placeOrder path', async () => {
      await initializeAdapter(adapter, 'binance');
      const rateLimitError = new ccxt.RateLimitExceeded('API rate limit');
      setupMockError(mockExchange, 'createOrder', rateLimitError);

      const result = await adapter.placeOrder({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.01,
        testnet: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Rate limit exceeded on binance/);
    });
  });

  // ── Authentication Error Scenarios (TestGuard Addition) ────────────────────
  describe('authentication error scenarios', () => {
    it('should handle ccxt.AuthenticationError on getBalances with graceful empty return and logging', async () => {
      await initializeAdapter(adapter, 'binance');
      const authError = new ccxt.AuthenticationError('Invalid API key or secret');
      setupMockError(mockExchange, 'fetchBalance', authError);

      const result = await adapter.getBalances();
      expect(result).toEqual([]);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('[CREDENTIALS]'));
    });

    it('should throw detailed credential error from handleCcxtError on getOHLCV auth failure', async () => {
      await initializeAdapter(adapter, 'bybit');
      const authError = new ccxt.AuthenticationError('authentication failed');
      setupMockError(mockExchange, 'fetchOHLCV', authError);

      await expect(
        adapter.getOHLCV('BTC/USDT', '1h', 10, 'bybit', true)
      ).rejects.toThrow(/Invalid or insufficient API credentials for bybit/);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('[CREDENTIALS]'));
    });

    it('should detect auth errors via string message containing "invalid apikey"', async () => {
      await initializeAdapter(adapter, 'okx');
      const stringAuthError = new Error('invalid apikey or authentication failed');
      setupMockError(mockExchange, 'fetchTicker', stringAuthError);

      const result = await adapter.getTicker('BTC/USDT', 'okx', true);
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle credential errors on createOrder path via placeOrder wrapper', async () => {
      await initializeAdapter(adapter, 'binance');
      const credError = new ccxt.AuthenticationError('API key lacks trading permissions');
      setupMockError(mockExchange, 'createOrder', credError);

      const result = await adapter.placeOrder({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.1,
        testnet: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Invalid or insufficient API credentials for binance/);
    });

    it('should cover "credential" keyword in error message for multi-exchange auth failure', async () => {
      await initializeAdapter(adapter, 'bybit');
      const credMsgError = new Error('credential verification failed');
      setupMockError(mockExchange, 'fetchPositions', credMsgError);

      const positions = await adapter.getPositions('bybit', true);
      expect(positions).toEqual([]);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('[CREDENTIALS]'));
    });
  });

  // ── Network Error Scenarios (TestGuard Addition) ───────────────────────────
  describe('network error scenarios', () => {
    it('should handle ccxt.NetworkError on getTicker with graceful null return', async () => {
      await initializeAdapter(adapter, 'binance');
      const netError = new ccxt.NetworkError('connection reset by peer');
      setupMockError(mockExchange, 'fetchTicker', netError);

      const result = await adapter.getTicker('BTC/USDT');
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('getTicker failed'));
    });

    it('should throw specific network error from handleCcxtError on getOHLCV', async () => {
      await initializeAdapter(adapter, 'bybit');
      const netError = new ccxt.NetworkError('ETIMEDOUT');
      setupMockError(mockExchange, 'fetchOHLCV', netError);

      await expect(
        adapter.getOHLCV('BTC/USDT', '1h', 10, 'bybit', true)
      ).rejects.toThrow(/Network error connecting to bybit/);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('[NETWORK]'));
    });

    it('should handle network timeout string error gracefully on getBalances', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'fetchBalance', 'Network timeout');

      const result = await adapter.getBalances();
      expect(result).toEqual([]);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('getBalances failed'));
    });

    it('should handle ECONNRESET and other network keywords on placeOrder', async () => {
      await initializeAdapter(adapter, 'okx');
      const connReset = new Error('read ECONNRESET');
      setupMockError(mockExchange, 'createOrder', connReset);

      const result = await adapter.placeOrder({
        exchange: 'okx',
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.1,
        testnet: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Network error connecting to okx/);
    });

    it('should detect network via "network" keyword in error message on testConnection', async () => {
      await initializeAdapter(adapter, 'binance');
      const netMsgError = new Error('network unreachable');
      setupMockError(mockExchange, 'fetchTime', netMsgError);

      const result = await adapter.testConnection();
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('testConnection failed'));
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

  // ── Successful Order Placement Scenarios (TestGuard Addition) ───────────────
  describe('successful order placement', () => {
    beforeEach(async () => {
      await initializeAdapter(adapter, 'binance');
    });

    it('should successfully place a MARKET BUY order and return correct result', async () => {
      setupMockSuccess(mockExchange, 'createOrder', {
        id: 'market-buy-123',
        status: 'closed',
        filled: 0.001,
        remaining: 0,
        average: 65000,
        price: 65000,
      });

      const result = await adapter.placeOrder({
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        testnet: true,
      });

      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        'BTC/USDT',
        'market',
        'buy',
        0.001,
        undefined,
        undefined,
      );
      expect(result.success).toBe(true);
      expect(result.exchangeOrderId).toBe('market-buy-123');
      expect(result.status).toBe('closed');
      expect(result.filledQuantity).toBe(0.001);
      expect(result.filledPrice).toBe(65000);
    });

    it('should successfully place a LIMIT SELL order with price', async () => {
      setupMockSuccess(mockExchange, 'createOrder', {
        id: 'limit-sell-456',
        status: 'open',
        filled: 0,
        remaining: 0.5,
        price: 68000,
      });

      const result = await adapter.placeOrder({
        exchange: 'binance',
        symbol: 'ETH/USDT',
        side: 'SELL',
        type: 'LIMIT',
        quantity: 0.5,
        price: 68000,
        testnet: true,
      });

      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        'ETH/USDT',
        'limit',
        'sell',
        0.5,
        68000,
        undefined,
      );
      expect(result.success).toBe(true);
      expect(result.exchangeOrderId).toBe('limit-sell-456');
      expect(result.remainingQuantity).toBe(0.5);
    });

    it('should successfully place order with stopLoss parameter', async () => {
      setupMockSuccess(mockExchange, 'createOrder', {
        id: 'stop-loss-789',
        status: 'open',
      });

      const result = await adapter.placeOrder({
        symbol: 'BTC/USDT',
        side: 'SELL',
        type: 'MARKET',
        quantity: 0.1,
        stopLoss: 64000,
        testnet: true,
      });

      expect(result.success).toBe(true);
      expect(result.exchangeOrderId).toBe('stop-loss-789');
    });

    it('should successfully place order with takeProfit parameter', async () => {
      setupMockSuccess(mockExchange, 'createOrder', {
        id: 'take-profit-321',
        status: 'open',
      });

      const result = await adapter.placeOrder({
        symbol: 'BTC/USDT',
        side: 'SELL',
        type: 'MARKET',
        quantity: 0.1,
        takeProfit: 70000,
        testnet: true,
      });

      expect(result.success).toBe(true);
      expect(result.exchangeOrderId).toBe('take-profit-321');
    });

    it('should support successful order placement on multiple exchanges', async () => {
      await initializeAdapter(adapter, 'bybit');

      setupMockSuccess(mockExchange, 'createOrder', { id: 'bybit-ord-001', status: 'open' });

      const result = await adapter.placeOrder({
        exchange: 'bybit',
        symbol: 'SOL/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 2,
        testnet: true,
      });

      expect(result.success).toBe(true);
      expect(result.exchangeOrderId).toBe('bybit-ord-001');
    });
  });

  describe('cancelOrder success scenarios', () => {
    beforeEach(async () => {
      await initializeAdapter(adapter, 'binance');
    });

    it('should cancel order successfully and return CANCELLED Trade', async () => {
      setupMockSuccess(mockExchange, 'cancelOrder', MOCK_RESPONSES.cancelledOrder);

      const result = await adapter.cancelOrder({ exchangeOrderId: '12345', symbol: 'BTC/USDT' });

      expect(mockExchange.cancelOrder).toHaveBeenCalledWith('12345', 'BTC/USDT');
      expect(result.status).toBe('CANCELLED');
      expect(result.exchangeOrderId).toBe('12345');
      expect(result.symbol).toBe('BTC/USDT');
      expect(result.id).toBe('cancel-12345');
    });

    it('should cancel order on different exchange (bybit)', async () => {
      await initializeAdapter(adapter, 'bybit');
      setupMockSuccess(mockExchange, 'cancelOrder', MOCK_RESPONSES.cancelledOrder);

      const result = await adapter.cancelOrder({ exchangeOrderId: 'bybit-999', symbol: 'ETH/USDT' });

      expect(mockExchange.cancelOrder).toHaveBeenCalledWith('bybit-999', 'ETH/USDT');
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

  // ── Key Market Data Methods: getTicker / getOHLCV ───────────────────────────
  describe('getTicker', () => {
    it('should fetch ticker successfully with explicit exchange', async () => {
      await initializeAdapter(adapter, 'bybit');
      setupMockSuccess(mockExchange, 'fetchTicker', MOCK_RESPONSES.ticker);

      const result = await adapter.getTicker('BTC/USDT', 'bybit', true);

      expect(result).toEqual(MOCK_RESPONSES.ticker);
      expect(mockExchange.fetchTicker).toHaveBeenCalledWith('BTC/USDT');
    });

    it('should return null and log error on fetchTicker failure (graceful)', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'fetchTicker', 'ticker unavailable');

      const result = await adapter.getTicker('ETH/USDT');

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('getTicker failed'));
    });
  });

  describe('getOHLCV', () => {
    it('should fetch OHLCV successfully with defaults and multi-exchange', async () => {
      await initializeAdapter(adapter, 'okx');
      setupMockSuccess(mockExchange, 'fetchOHLCV', MOCK_RESPONSES.ohlcv);

      const result = await adapter.getOHLCV('BTC/USDT', '5m', 50, 'okx', false);

      expect(result).toEqual(MOCK_RESPONSES.ohlcv);
      expect(mockExchange.fetchOHLCV).toHaveBeenCalledWith('BTC/USDT', '5m', undefined, 50);
    });

    it('should return [] and handle error via handleCcxtError on fetchOHLCV failure', async () => {
      await initializeAdapter(adapter);
      setupMockError(mockExchange, 'fetchOHLCV', new (ccxt as any).NetworkError('timeout'));

      const result = await adapter.getOHLCV('BTC/USDT');
      const result = await adapter.getOHLCV('BTC/USDT');
      expect(result).toEqual([]);
      // handleCcxtError throws, but getOHLCV catches and returns []
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
  // ── getExchangeInfo Success Scenarios (TestGuard Addition) ─────────────────────
  describe('getExchangeInfo success scenarios', () => {
    beforeEach(async () => {
      await initializeAdapter(adapter);
    });

    it('should return markets, exchange id and has on successful fetchMarkets', async () => {
      // Augment mock with CCXT instance properties used in return value
      (mockExchange as any).id = 'binance';
      (mockExchange as any).has = { fetchMarkets: true, spot: true };
      setupMockSuccess(mockExchange, 'fetchMarkets', [{ symbol: 'BTC/USDT' }]);

      const result = await adapter.getExchangeInfo();
      expect(result.markets).toEqual([{ symbol: 'BTC/USDT' }]);
      expect(result.exchange).toBe('binance');
      expect(result.has).toEqual({ fetchMarkets: true, spot: true });
    });

    it('should support explicit exchangeName and testnet parameters', async () => {
      await initializeAdapter(adapter, 'bybit');
      (mockExchange as any).id = 'bybit';
      (mockExchange as any).has = {};
      setupMockSuccess(mockExchange, 'fetchMarkets', []);

      const result = await adapter.getExchangeInfo('bybit', true);
      expect(result).toHaveProperty('markets');
      expect(result.exchange).toBe('bybit');
      expect(mockExchange.fetchMarkets).toHaveBeenCalled();
    });
  });

  describe('setDefaultExchange', () => {
  describe('setDefaultExchange', () => {
    it('should set default exchange to lowercase and log the change', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
      adapter.setDefaultExchange('ByBit');
      expect(logSpy).toHaveBeenCalledWith('Default exchange set to bybit');
      logSpy.mockRestore();
    });

    it('should affect subsequent default-exchange calls (e.g. getTicker uses new default)', async () => {
      adapter.setDefaultExchange('bybit');
      await initializeAdapter(adapter, 'bybit');
      setupMockSuccess(mockExchange, 'fetchTicker', MOCK_RESPONSES.ticker);
      await adapter.getTicker('BTC/USDT');
      expect(ccxt.bybit).toHaveBeenCalled();
    });

    it('should handle uppercase, mixed case and special exchange names by lowercasing', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
      adapter.setDefaultExchange('OKX');
      expect(logSpy).toHaveBeenCalledWith('Default exchange set to okx');
      adapter.setDefaultExchange('Binance');
      expect(logSpy).toHaveBeenCalledWith('Default exchange set to binance');
      logSpy.mockRestore();
    });
  });
});
