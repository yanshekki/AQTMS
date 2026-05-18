import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaperTradingService } from '../paper-trading/paper-trading.service';
import { NotificationService } from '../notification/notification.service';
import { KillSwitchService } from '../safety/kill-switch.service';
import { DailyPnLService } from './daily-pnl.service';
import { ExchangePositionProvider } from '../exchange/interfaces/exchange-position.provider';
import { ExchangeAccountRepository } from '../infrastructure/persistence/ExchangeAccountRepository';

/**
 * PortfolioService Unit Tests
 *
 * Focus areas for improved coverage and quality:
 * - Multi-tier position fallback logic (live provider → paper trading → Prisma DB)
 * - Portfolio summary calculations (total value, unrealized PnL)
 * - Integration points with DailyPnLService, KillSwitchService, NotificationService
 * - Error handling and graceful degradation
 *
 * Mocks all optional dependencies to isolate the service.
 * Tests verify both happy paths and fallback scenarios.
 */
describe('PortfolioService', () => {
  let service: PortfolioService;
  let prismaService: PrismaService;
  let paperTradingService: PaperTradingService;
  let positionProvider: ExchangePositionProvider;
  let dailyPnLService: DailyPnLService;
  let killSwitchService: KillSwitchService;

  const mockPositions = [
    { symbol: 'BTCUSDT', quantity: 0.5, avgPrice: 60000, currentPrice: 61000, unrealizedPnl: 500 },
    { symbol: 'ETHUSDT', quantity: 2, avgPrice: 3000, currentPrice: 3100, unrealizedPnl: 200 },
  ];

  beforeEach(async () => {
    const mockPrisma = {
      position: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockPaperTrading = {
      getPositions: jest.fn().mockResolvedValue([]),
    };

    const mockPositionProvider = {
      getPositions: jest.fn().mockResolvedValue([]),
    };

    const mockDailyPnL = {
      updateDailyPnL: jest.fn().mockResolvedValue(undefined),
    };

    const mockKillSwitch = {
      updateDailyPnl: jest.fn().mockResolvedValue(undefined),
    };

    const mockNotification = {
      sendAlert: jest.fn().mockResolvedValue(undefined),
    };

    const mockExchangeAccountRepo = {
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaperTradingService, useValue: mockPaperTrading },
        { provide: 'EXCHANGE_POSITION_PROVIDER', useValue: mockPositionProvider },
        { provide: DailyPnLService, useValue: mockDailyPnL },
        { provide: KillSwitchService, useValue: mockKillSwitch },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ExchangeAccountRepository, useValue: mockExchangeAccountRepo },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    prismaService = module.get<PrismaService>(PrismaService);
    paperTradingService = module.get<PaperTradingService>(PaperTradingService);
    positionProvider = module.get<ExchangePositionProvider>('EXCHANGE_POSITION_PROVIDER');
    dailyPnLService = module.get<DailyPnLService>(DailyPnLService);
    killSwitchService = module.get<KillSwitchService>(KillSwitchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPositions', () => {
    it('should return live positions from provider when available', async () => {
      (positionProvider.getPositions as jest.Mock).mockResolvedValue(mockPositions);

      const result = await service.getPositions('user-123');

      expect(result).toEqual(mockPositions);
      expect(positionProvider.getPositions).toHaveBeenCalledWith('user-123');
      expect(paperTradingService.getPositions).not.toHaveBeenCalled();
    });

    it('should fallback to paper trading when live provider returns empty or fails', async () => {
      (positionProvider.getPositions as jest.Mock).mockResolvedValue([]);
      (paperTradingService.getPositions as jest.Mock).mockResolvedValue(mockPositions);

      const result = await service.getPositions('user-123');

      expect(result).toEqual(mockPositions);
      expect(paperTradingService.getPositions).toHaveBeenCalledWith('user-123');
    });

    it('should fallback to Prisma DB when both providers fail or return empty', async () => {
      (positionProvider.getPositions as jest.Mock).mockRejectedValue(new Error('Live provider down'));
      (paperTradingService.getPositions as jest.Mock).mockResolvedValue([]);

      const dbPositions = [
        { symbol: 'SOLUSDT', quantity: 10, avgPrice: 150, unrealizedPnl: 100 },
      ];
      (prismaService.position.findMany as jest.Mock).mockResolvedValue(dbPositions);

      const result = await service.getPositions('user-123');

      expect(result[0]).toMatchObject({
        symbol: 'SOLUSDT',
        quantity: 10,
        side: 'BUY',
      });
      expect(prismaService.position.findMany).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
    });

    it('should return empty array on complete failure', async () => {
      (positionProvider.getPositions as jest.Mock).mockRejectedValue(new Error('fail'));
      (paperTradingService.getPositions as jest.Mock).mockRejectedValue(new Error('fail'));
      (prismaService.position.findMany as jest.Mock).mockRejectedValue(new Error('db fail'));

      const result = await service.getPositions('user-123');
      expect(result).toEqual([]);
    });
  });

  describe('getPortfolioSummary', () => {
    it('should calculate total value and unrealized PnL correctly', async () => {
      (positionProvider.getPositions as jest.Mock).mockResolvedValue(mockPositions);

      const summary = await service.getPortfolioSummary('user-123');

      expect(summary.totalValue).toBeCloseTo(0.5 * 61000 + 2 * 3100); // 30500 + 6200 = 36700
      expect(summary.totalUnrealizedPnl).toBe(700);
      expect(dailyPnLService.updateDailyPnL).toHaveBeenCalledWith('user-123', 700);
      expect(killSwitchService.updateDailyPnl).toHaveBeenCalledWith(700, 'user-123');
    });

    it('should handle empty positions gracefully', async () => {
      (positionProvider.getPositions as jest.Mock).mockResolvedValue([]);

      const summary = await service.getPortfolioSummary('user-123');

      expect(summary.totalValue).toBe(0);
      expect(summary.totalUnrealizedPnl).toBe(0);
    });
  });
});
