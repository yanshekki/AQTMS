import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Trading Terminal E2E', () => {
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

  it('should place a quick paper order successfully', async () => {
    const orderData = {
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 0.001,
      isPaper: true,
      userId: 'demo-user',
      exchangeAccountId: 'demo-paper',
    };

    const res = await request(app.getHttpServer())
      .post('/execution/execute')
      .send(orderData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.mode).toBe('PAPER');
  });

  it('should validate testing environment', async () => {
    const res = await request(app.getHttpServer())
      .post('/execution/validate-testing')
      .send({ userId: 'demo-user', exchangeAccountId: 'demo-account' });

    expect(res.body).toHaveProperty('ready');
  });
});
