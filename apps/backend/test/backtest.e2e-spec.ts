import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Backtest E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    });

  it('should run a backtest successfully', async () => {
    const backtestRequest = {
      strategyName: 'sma_crossover',
      strategyParams: { shortPeriod: 10, longPeriod: 30 },
      symbol: 'BTCUSDT',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      initialCapital: 10000,
    };

    const res = await request(app.getHttpServer())
      .post('/backtest/run')
      .send(backtestRequest)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('sharpeRatio');
    expect(res.body).toHaveProperty('maxDrawdown');
    expect(res.body).toHaveProperty('winRate');
  });

  it('should return proper metrics structure', async () => {
    const backtestRequest = {
      strategyName: 'sma_crossover',
      strategyParams: {},
      symbol: 'ETHUSDT',
      startDate: '2025-02-01',
      endDate: '2025-02-28',
      initialCapital: 5000,
    };

    const res = await request(app.getHttpServer())
      .post('/backtest/run')
      .send(backtestRequest);

    const result = res.body;
    expect(result).toHaveProperty('totalReturn');
    expect(result).toHaveProperty('sharpeRatio');
    expect(result).toHaveProperty('profitFactor');
    expect(result).toHaveProperty('equityCurve');
  });
});
