// ── Risk & Backtest API Routes ──

import { Router } from 'express';
import { RiskEngine } from '../../../application/services/RiskEngine';
import { PositionSizingCalculator } from '../../../application/services/PositionSizingCalculator';
import { BacktestService } from '../../../application/services/BacktestService';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../shared/logger';
import { permission } from '../middleware/permission.middleware';
import { detectLang, t } from '../../../shared/i18n';

const prisma = new PrismaClient();
const riskEngine = new RiskEngine();
const sizingCalculator = new PositionSizingCalculator(riskEngine);
const backtestService = new BacktestService();

export function createRiskRoutes(): Router {
  const router = Router();

  // POST /api/v1/risk/metrics — compute risk metrics for a portfolio
  router.post('/metrics', permission(['risk:view']), async (req, res, next) => {
    try {
      const { portfolio } = req.body as { portfolio: Array<{ asset: string; quantity: number; currentPrice: number; historicalReturns: number[] }> };
      const metrics = riskEngine.computeMetrics(portfolio);
      res.json({ success: true, data: metrics, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  // POST /api/v1/risk/position-size — calculate position size
  router.post('/position-size', permission(['trade:execute']), async (req, res, next) => {
    try {
      const result = sizingCalculator.compareAll(req.body);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  // POST /api/v1/risk/evaluate — check if a trade passes risk rules
  router.post('/evaluate', permission(['risk:view']), async (req, res, next) => {
    try {
      const { trade, portfolio, dailyPnL } = req.body as {
        trade: { symbol: string; quantity: number; price: number };
        portfolio: Array<{ asset: string; quantity: number; currentPrice: number; historicalReturns: number[] }>;
        dailyPnL: number;
      };
      const result = riskEngine.evaluateTrade(trade, portfolio, dailyPnL);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  return router;
}

export function createBacktestRoutes(): Router {
  const router = Router();

  // POST /api/v1/backtest/run — run backtest
  router.post('/run', permission(['backtest:run']), async (req, res, next) => {
    try {
      const result = await backtestService.runBacktest(req.body);
      logger.info({ id: result.id, symbol: result.symbol, return: result.totalReturn }, 'Backtest completed');

      // Persist to DB
      try {
        await prisma.backtestReport.create({
          data: {
            userId: (req.user?.userId) ?? 'anonymous',
            symbol: result.symbol,
            startDate: new Date(result.startDate),
            endDate: new Date(result.endDate),
            initialCapital: result.initialCapital,
            finalCapital: result.finalCapital,
            totalReturn: result.totalReturn,
            totalPnL: result.totalPnL,
            totalTrades: result.totalTrades,
            winningTrades: result.winningTrades,
            losingTrades: result.losingTrades,
            winRate: result.winRate,
            avgWin: result.avgWin,
            avgLoss: result.avgLoss,
            profitFactor: result.profitFactor,
            maxDrawdown: result.maxDrawdown,
            maxDrawdownDuration: result.maxDrawdownDuration,
            sharpeRatio: result.sharpeRatio,
            sortinoRatio: result.sortinoRatio,
            calmarRatio: result.calmarRatio,
            totalFees: result.totalFees,
            equityCurve: JSON.stringify(result.equityCurve),
            drawdownCurve: JSON.stringify(result.drawdownCurve),
            monthlyReturns: JSON.stringify(result.monthlyReturns),
            trades: JSON.stringify(result.trades),
            parameters: JSON.stringify(result.parameters),
          },
        });
      } catch (dbErr) { logger.warn({ dbErr }, 'Failed to persist backtest report'); }

      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  // GET /api/v1/backtest/history — list past backtests
  router.get('/history', permission(['backtest:run']), async (_req, res, next) => {
    try {
      const reports = await prisma.backtestReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, symbol: true, startDate: true, endDate: true,
          totalReturn: true, winRate: true, sharpeRatio: true, maxDrawdown: true,
          totalTrades: true, createdAt: true,
        },
      });
      res.json({ success: true, data: reports, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  // GET /api/v1/backtest/:id — get full report detail
  router.get('/:id', permission(['backtest:run']), async (req, res, next) => {
    try {
      const report = await prisma.backtestReport.findUnique({ where: { id: String(req.params.id) } });
      if (!report) {
        const lang = detectLang(req);
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('backtest.not_found', lang) }, timestamp: new Date().toISOString() });
        return;
      }
      res.json({
        success: true,
        data: {
          ...report,
          equityCurve: JSON.parse(report.equityCurve) as unknown,
          drawdownCurve: JSON.parse(report.drawdownCurve) as unknown,
          monthlyReturns: JSON.parse(report.monthlyReturns) as unknown,
          trades: JSON.parse(report.trades) as unknown,
          parameters: JSON.parse(report.parameters) as unknown,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) { next(err); }
  });

  return router;
}
