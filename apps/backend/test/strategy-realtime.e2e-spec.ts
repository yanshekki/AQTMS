import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Strategy + Real-time E2E (Production Focus)', () => {
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

  it('should deploy strategy and trigger evaluation (real data path)', async () => {
    // Deploy a strategy
    const deployRes = await request(app.getHttpServer())
      .post('/api/strategies/demo-strategy/deploy')
      .send({ active: true })
      .expect(201);

    expect(deployRes.body.success).toBe(true);

    // Trigger a manual evaluation (in real system this would be via scheduler)
    const evalRes = await request(app.getHttpServer())
      .post('/api/strategies/demo-strategy/evaluate')
      .send({ symbol: 'BTCUSDT' });

    // Should not fail even if no trade triggered
    expect([200, 201, 204]).toContain(evalRes.status);
  });

  it('should handle real-time order execution with risk check', async () => {
    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/execution/execute')
      .send({
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        isPaper: true,
      });

    expect([200, 201]).toContain(orderRes.status);
  });
});
