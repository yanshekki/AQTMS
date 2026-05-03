// ── Trade Routes ──
// Permission check happens BEFORE controller execution.
// Route-level RBAC: only users with 'trade:execute:*' can place trades.

import { Router } from 'express';
import { TradeController } from '../controllers/TradeController';
import { permission } from '../middleware/permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateTradeDtoSchema, CancelTradeDtoSchema } from '../dto';
import type { ExecuteTradeUseCase } from '../../../application/use-cases/ExecuteTradeUseCase';
import type { CancelTradeUseCase } from '../../../application/use-cases/CancelTradeUseCase';

export function createTradeRoutes(
  executeTradeUseCase: ExecuteTradeUseCase,
  cancelTradeUseCase: CancelTradeUseCase,
): Router {
  const router = Router();
  const controller = new TradeController(executeTradeUseCase, cancelTradeUseCase);

  // POST /api/v1/trades
  router.post(
    '/',
    permission(['trade:execute']),                          // Route-level RBAC
    validate(CreateTradeDtoSchema),                         // DTO validation
    controller.execute,                                     // Thin controller
  );

  // DELETE /api/v1/trades — cancel order
  router.delete(
    '/',
    permission(['trade:cancel']),
    validate(CancelTradeDtoSchema),
    controller.cancel,
  );

  // GET /api/v1/trades — list trades with filters
  router.get('/', permission(['trade:read']), async (req, res, next) => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const symbol = req.query.symbol as string | undefined;
      const side = req.query.side as string | undefined;
      const status = req.query.status as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      const userId = req.user?.userId;
      const where: Record<string, unknown> = { userId };
      if (symbol) where.symbol = { contains: symbol.toUpperCase() };
      if (side) where.side = side;
      if (status) where.status = status;
      if (from || to) {
        const dateFilter: Record<string, Date> = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) dateFilter.lte = new Date(to);
        where.createdAt = dateFilter;
      }

      const [trades, total] = await Promise.all([
        prisma.trade.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.trade.count({ where }),
      ]);

      res.json({
        success: true,
        data: { trades, total, page, limit, totalPages: Math.ceil(total / limit) },
        timestamp: new Date().toISOString(),
      });
    } catch (err) { next(err); }
  });

  // GET /api/v1/trades/:id — trade detail
  router.get('/:id', permission(['trade:read']), async (req, res, next) => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const trade = await prisma.trade.findUnique({ where: { id: String(req.params.id) } });
      if (!trade) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trade not found' }, timestamp: new Date().toISOString() });
        return;
      }
      res.json({ success: true, data: trade, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  return router;
}
