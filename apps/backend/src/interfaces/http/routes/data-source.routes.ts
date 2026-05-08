// ── DataSource Routes ──

import { Router } from 'express';
import { DataSourceController } from '../controllers/DataSourceController';
import { permission } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';

const ConnectDataSourceSchema = z.object({
  type: z.enum(['TELEGRAM', 'X', 'RSS', 'ONCHAIN']),
  name: z.string().min(1),
  config: z.record(z.unknown()),
});

const DeleteDataSourceSchema = z.object({
  id: z.string().uuid(),
});

export function createDataSourceRoutes(
  dataSourceController: DataSourceController
): Router {
  const router = Router();

  // POST /api/v1/data-sources - Connect new data source
  router.post(
    '/',
    permission(['data-source:connect']),
    validate(ConnectDataSourceSchema),
    dataSourceController.connect
  );

  // GET /api/v1/data-sources - List user's data sources
  router.get(
    '/',
    permission(['data-source:read']),
    dataSourceController.list
  );

  // DELETE /api/v1/data-sources/:id - Delete data source
  router.delete(
    '/:id',
    permission(['data-source:delete']),
    validate(DeleteDataSourceSchema),
    dataSourceController.delete
  );

  return router;
}
