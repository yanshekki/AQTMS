import { Test, TestingModule } from '@nestjs/testing';
import { StrategyRunnerService } from './strategy-runner.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionService } from '../execution/execution.service';
import { RiskService } from '../risk/risk.service';
import { Logger } from '@nestjs/common';

describe('StrategyRunnerService', () => {
  let service: StrategyRunnerService;
  let prismaService: PrismaService;
  let executionService: ExecutionService;
  let riskService: RiskService;
  let marketDataService: any;

  const mockStrategy = {
    id: 'strat-123',
    name: 'Test SMA Strategy',
    type: 'sma_crossover',
    symbol: 'BTCUSDT',
    params: JSON.stringify({ shortPeriod: 5, longPeriod: 20, quantity: 0.01 }),
    userId: 'user-456',
  };

  beforeEach(async () => {
    const mockPrisma = {
      strategy: {
        findUnique: jest.fn(),
      },
    };

    const mockExecution = {
      executeOrder: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockRisk = {
      validateOrder: jest.fn().mockResolvedValue({ allowed: true }),
    };

    marketDataService = {
      getRecentPrices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategyRunnerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ExecutionService, useValue: mockExecution },
        { provide: RiskService, useValue: mockRisk },
        { provide: 'IMarketDataService', useValue: marketDataService },
      ],
    }).compile();

    service = module.get<StrategyRunnerService>(StrategyRunnerService);
    prismaService = module.get<PrismaService>(PrismaService);
    executionService = module.get<ExecutionService>(ExecutionService);
    riskService = module.get<RiskService>(RiskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deployStrategy', () => {
    it('should deploy and activate a strategy successfully', async () => {
      (prismaService as any).strategy.findUnique.mockResolvedValue(mockStrategy);

      const result = await service.deployStrategy('strat-123', 'user-456', true);

      expect(result.success).toBe(true);
      expect(result.message).toContain('now active');
      expect(service.isStrategyActive('strat-123')).toBe(true);
      expect((prismaService as any).strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 'strat-123' },
      });
    });

    it('should return failure when strategy not found', async () => {
      (prismaService as any).strategy.findUnique.mockResolvedValue(null);

      const result = await service.deployStrategy('nonexistent', 'user-456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Strategy not found');
      expect(service.isStrategyActive('nonexistent')).toBe(false);
    });
  });

  describe('stopStrategy', () => {
    it('should stop an active strategy', async () => {
      await service.deployStrategy('strat-123', 'user-456');
      const result = await service.stopStrategy('strat-123');

      expect(result.success).toBe(true);
      expect(service.isStrategyActive('strat-123')).toBe(false);
    });
  });

  describe('runActiveStrategies', () => {
    it('should skip when no active strategies', async () => {
      await service.runActiveStrategies();
      expect((prismaService as any).strategy.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch market data and execute order for SMA crossover when conditions met', async () => {
      (prismaService as any).strategy.findUnique.mockResolvedValue(mockStrategy);
      marketDataService.getRecentPrices.mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => 60000 + i * 10), // rising prices
      );
      await service.deployStrategy('strat-123', 'user-456');

      await service.runActiveStrategies();

      expect(marketDataService.getRecentPrices).toHaveBeenCalledWith('BTCUSDT', 30);
      expect(executionService.executeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTCUSDT',
          side: 'BUY',
          type: 'MARKET',
          isPaper: true,
        }),
      );
    });

    it('should skip execution when not enough price data', async () => {
      (prismaService as any).strategy.findUnique.mockResolvedValue(mockStrategy);
      marketDataService.getRecentPrices.mockResolvedValue([60000]); // too few
      await service.deployStrategy('strat-123', 'user-456');

      await service.runActiveStrategies();

      expect(executionService.executeOrder).not.toHaveBeenCalled();
    });

    it('should handle missing MarketDataService gracefully', async () => {
      // Re-create without marketData mock to simulate missing
      const moduleWithoutMarket: TestingModule = await Test.createTestingModule({
        providers: [
          StrategyRunnerService,
          { provide: PrismaService, useValue: { strategy: { findUnique: jest.fn().mockResolvedValue(mockStrategy) } } },
          { provide: ExecutionService, useValue: { executeOrder: jest.fn() } },
          { provide: RiskService, useValue: {} },
        ],
      }).compile();

      const svc = moduleWithoutMarket.get<StrategyRunnerService>(StrategyRunnerService);
      await svc.deployStrategy('strat-123', 'user-456');
      await svc.runActiveStrategies();

      // Should log warn and continue without crash
      expect(true).toBe(true); // no throw
    });

    it('should log error on unexpected failure during run', async () => {
      (prismaService as any).strategy.findUnique.mockRejectedValue(new Error('DB error'));
      await service.deployStrategy('strat-123', 'user-456');

      await expect(service.runActiveStrategies()).resolves.not.toThrow();
    });
  });

  describe('evaluateStrategy (via run)', () => {
    it('should return false for unsupported strategy type', async () => {
      const badStrategy = { ...mockStrategy, type: 'unknown_type' };
      (prismaService as any).strategy.findUnique.mockResolvedValue(badStrategy);
      marketDataService.getRecentPrices.mockResolvedValue(Array(30).fill(50000));
      await service.deployStrategy('strat-123', 'user-456');

      await service.runActiveStrategies();
      expect(executionService.executeOrder).not.toHaveBeenCalled();
    });
  });
});
