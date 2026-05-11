import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Strategy Deployment E2E', () => {
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

  it('should deploy a strategy successfully', async () => {
    // This assumes a strategy with id 'demo-strategy' exists or is created in test setup
    const res = await request(app.getHttpServer())
      .post('/strategies/demo-strategy/deploy')
      .send({ active: true })
      .expect(201);

    expect(res.body.success).toBe(true);
  });
});
