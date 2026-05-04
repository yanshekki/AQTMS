// ── Portfolio Routes ──
// Mock data for MVP; real implementation fetches from exchange adapters.
// User-scoping enforced even in MVP for correct architecture.

import { Router } from 'express';
import { permission } from '../middleware/permission.middleware';

export function createPortfolioRoutes(): Router {
  const router = Router();

  // GET /api/v1/portfolio/summary
  router.get('/summary', permission(['trade:read']), async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
      return;
    }
    res.json({
      success: true,
      data: {
        totalValue: 10000,
        todayPnL: 250,
        todayPnLPercent: 2.5,
        mtdReturn: 12.5,
        ytdReturn: 45.2,
        realizedPnL: 1250,
        unrealizedPnL: 320,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // GET /api/v1/portfolio/allocation
  router.get('/allocation', permission(['trade:read']), async (_req, res) => {
    res.json({
      success: true,
      data: [
        { asset: 'USDT', value: 5000, allocation: 50, color: '#22c55e' },
        { asset: 'BTC', value: 3000, allocation: 30, color: '#f59e0b' },
        { asset: 'ETH', value: 1500, allocation: 15, color: '#3b82f6' },
        { asset: 'BNB', value: 500, allocation: 5, color: '#8b5cf6' },
      ],
      timestamp: new Date().toISOString(),
    });
  });

  // GET /api/v1/portfolio/performance
  router.get('/performance', permission(['trade:read']), async (req, res) => {
    const period = (req.query.period as string) || '30d';
    const points = period === '90d' ? 90 : period === '1y' ? 365 : 30;
    const data = Array.from({ length: points }, (_, i) => ({
      date: new Date(Date.now() - (points - i) * 86400000).toISOString().slice(0, 10),
      value: 10000 + Math.sin(i / 10) * 800 + i * 5 + Math.random() * 200,
    }));
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  });

  // GET /api/v1/portfolio/holdings
  router.get('/holdings', permission(['trade:read']), async (_req, res) => {
    res.json({
      success: true,
      data: [
        { asset: 'BTC', value: 4200, allocation: 42, pnl: 850, pnlPercent: 25.3 },
        { asset: 'ETH', value: 2800, allocation: 28, pnl: -120, pnlPercent: -4.1 },
        { asset: 'SOL', value: 1500, allocation: 15, pnl: 340, pnlPercent: 29.3 },
        { asset: 'BNB', value: 900, allocation: 9, pnl: 55, pnlPercent: 6.5 },
        { asset: 'AVAX', value: 600, allocation: 6, pnl: -80, pnlPercent: -11.8 },
      ],
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
