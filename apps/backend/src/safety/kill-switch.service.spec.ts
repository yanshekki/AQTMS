import { Test, TestingModule } from '@nestjs/testing';
import { KillSwitchService } from './kill-switch.service';
import { DailyPnLService } from '../portfolio/daily-pnl.service';

describe('KillSwitchService', () => {
  let service: KillSwitchService;
  let dailyPnLService: DailyPnLService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KillSwitchService,
        {
          provide: DailyPnLService,
          useValue: {
            updateDailyPnL: jest.fn(),
            getTodayPnL: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    service = module.get<KillSwitchService>(KillSwitchService);
    dailyPnLService = module.get<DailyPnLService>(DailyPnLService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should allow trading by default', async () => {
    const result = await service.isTradingAllowed();
    expect(result.allowed).toBe(true);
  });

  it('should trigger kill switch and block trading', async () => {
    service.triggerKillSwitch('Manual test');
    const result = await service.isTradingAllowed();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Kill switch is active');
  });

  it('should reset kill switch', async () => {
    service.triggerKillSwitch('Test');
    service.resetKillSwitch();
    const result = await service.isTradingAllowed();
    expect(result.allowed).toBe(true);
  });

  it('should trigger kill switch when daily loss limit is reached', async () => {
    // Mock that today PnL is below limit
    jest.spyOn(dailyPnLService, 'getTodayPnL').mockResolvedValue(-600);

    const result = await service.isTradingAllowed();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Daily loss limit reached');
  });
});
