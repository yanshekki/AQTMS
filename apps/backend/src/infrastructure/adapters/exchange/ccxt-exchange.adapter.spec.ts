import { Test, TestingModule } from '@nestjs/testing';
import { CcxtExchangeAdapter } from './ccxt-exchange.adapter';
import * as ccxt from 'ccxt';

jest.mock('ccxt');

describe('CcxtExchangeAdapter', () => {
  let adapter: CcxtExchangeAdapter;
  let mockExchange: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CcxtExchangeAdapter],
    }).compile();

    adapter = module.get<CcxtExchangeAdapter>(CcxtExchangeAdapter);

    mockExchange = {
      fetchBalance: jest.fn(),
      createOrder: jest.fn(),
      cancelOrder: jest.fn(),
      fetchPositions: jest.fn(),
      fetchOrder: jest.fn(),
      fetchOpenOrders: jest.fn(),
      fetchTicker: jest.fn(),
      fetchTime: jest.fn(),
    };

    // Mock ccxt constructors
    (ccxt.binance as jest.Mock).mockImplementation(() => mockExchange);
    (ccxt.bybit as jest.Mock).mockImplementation(() => mockExchange);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    it('should return true when connection succeeds', async () => {
      await adapter.initialize({
        exchange: 'binance',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        testnet: true,
      });

      mockExchange.fetchBalance.mockResolvedValue({ total: { USDT: 100 } });

      // Note: testConnection not yet implemented in adapter, this tests the pattern
      const result = await adapter.testConnection?.();
      expect(result).toBe(true);
    });

    it('should return false when not initialized', async () => {
      const result = await adapter.testConnection?.();
      expect(result).toBe(false);
    });
  });

  describe('createOrder', () => {
    it('should create a market order successfully', async () => {
      await adapter.initialize({
        exchange: 'binance',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });

      const mockOrder = {
        id: '12345',
        status: 'open',
      };
      mockExchange.createOrder.mockResolvedValue(mockOrder);

      const request = {
        symbol: 'BTC/USDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: 0.001,
        idempotencyKey: 'test-key-1',
      };

      const result = await adapter.createOrder(request);

      expect(mockExchange.createOrder).toHaveBeenCalledWith(
        'BTC/USDT',
        'market',
        'buy',
        0.001,
        undefined
      );
      expect(result).toEqual({
        id: '12345',
        exchangeOrderId: '12345',
        symbol: 'BTC/USDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        price: 0,
        status: 'open',
        createdAt: expect.any(Date),
      });
    });

    it('should handle order creation errors', async () => {
      await adapter.initialize({ exchange: 'binance', apiKey: 'test' });

      mockExchange.createOrder.mockRejectedValue(new Error('Insufficient balance'));

      const request = {
        symbol: 'BTC/USDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: 1,
        idempotencyKey: 'test-key-2',
      };

      await expect(adapter.createOrder(request)).rejects.toThrow();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      await adapter.initialize({
        exchange: 'binance',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });

      const mockCancelResult = { id: '12345', status: 'canceled' };
      mockExchange.cancelOrder.mockResolvedValue(mockCancelResult);

      const request = {
        exchangeOrderId: '12345',
        symbol: 'BTC/USDT',
      };

      const result = await adapter.cancelOrder(request);

      expect(mockExchange.cancelOrder).toHaveBeenCalledWith('12345', 'BTC/USDT');
      expect(result.status).toBe('CANCELLED');
      expect(result.exchangeOrderId).toBe('12345');
    });

    it('should handle cancel order errors', async () => {
      await adapter.initialize({ exchange: 'binance', apiKey: 'test' });

      mockExchange.cancelOrder.mockRejectedValue(new Error('Order not found'));

      const request = {
        exchangeOrderId: 'nonexistent',
        symbol: 'BTC/USDT',
      };

      await expect(adapter.cancelOrder(request)).rejects.toThrow();
    });
  });

  describe('getPositions', () => {
    it('should return formatted positions', async () => {
      await adapter.initialize({
        exchange: 'binance',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });

      mockExchange.fetchPositions.mockResolvedValue([
        {
          symbol: 'BTC/USDT',
          side: 'long',
          contracts: 0.5,
          entryPrice: 50000,
          markPrice: 51000,
          unrealizedPnl: 500,
        },
      ]);

      const result = await adapter.getPositions();

      expect(result).toEqual([
        {
          symbol: 'BTC/USDT',
          side: 'BUY',
          quantity: 0.5,
          entryPrice: 50000,
          markPrice: 51000,
          unrealizedPnl: { amount: 500, currency: 'USDT' },
        },
      ]);
    });

    it('should return empty array on error', async () => {
      await adapter.initialize({ exchange: 'binance', apiKey: 'test' });

      mockExchange.fetchPositions.mockRejectedValue(new Error('Positions fetch failed'));

      const result = await adapter.getPositions();

      expect(result).toEqual([]);
    });
  });

  describe('getBalances', () => {
    it('should return formatted balances', async () => {
      await adapter.initialize({
        exchange: 'binance',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });

      mockExchange.fetchBalance.mockResolvedValue({
        total: { BTC: 1.5, USDT: 1000 },
        free: { BTC: 1.2, USDT: 900 },
        used: { BTC: 0.3, USDT: 100 },
      });

      const result = await adapter.getBalances();

      expect(result).toEqual([
        { asset: 'BTC', free: '1.2', locked: '0.3' },
        { asset: 'USDT', free: '900', locked: '100' },
      ]);
    });

    it('should return empty array on error', async () => {
      await adapter.initialize({ exchange: 'binance', apiKey: 'test' });

      mockExchange.fetchBalance.mockRejectedValue(new Error('Network error'));

      const result = await adapter.getBalances();

      expect(result).toEqual([]);
    });
  });
});
