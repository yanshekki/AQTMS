// ── Exchange Routes ──

import { Router } from 'express';
import { ExchangeController } from '../controllers/ExchangeController';
import { permission } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { ExchangeConnectRequestSchema } from '../dto';
import { ExchangeAccountRepository } from '../../../infrastructure/persistence/ExchangeAccountRepository';

export function createExchangeRoutes(encryptionKey: string): Router {
  const router = Router();
  const exchangeRepo = new ExchangeAccountRepository(encryptionKey);
  const controller = new ExchangeController(exchangeRepo);

  // POST /api/v1/exchanges/connect
  router.post(
    '/connect',
    permission(['exchange:connect']),
    validate(ExchangeConnectRequestSchema),
    controller.connect,
  );

  // GET /api/v1/exchanges — list all exchanges for current user
  router.get(
    '/',
    permission(['exchange:read']),
    controller.listByUser,
  );

  // GET /api/v1/exchanges/:id/balance
  router.get(
    '/:id/balance',
    permission(['exchange:read']),
    controller.getBalances,
  );

  // GET /api/v1/exchanges/:id/positions
  router.get(
    '/:id/positions',
    permission(['exchange:read']),
    controller.getPositions,
  );

  // POST /api/v1/exchanges/:id/test
  router.post(
    '/:id/test',
    permission(['exchange:connect']),
    controller.testConnection,
  );

  // DELETE /api/v1/exchanges/:id
  router.delete(
    '/:id',
    permission(['exchange:connect']),
    controller.delete,
  );

  return router;
}
