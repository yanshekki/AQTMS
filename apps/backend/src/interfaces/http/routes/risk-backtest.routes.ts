// ── Risk & Backtest API Routes ──

import { Router } from 'express';
import { RiskEngine } from '../../../application/services/RiskEngine';
import { PositionSizingCalculator } from '../../../application/services/PositionSizingCalculator';
import { BacktestService } from '../../../application/services/BacktestService';
import { prisma } from '../../../shared/prisma';
import { logger } from '../../../shared/logger';
import { permission } from '../middleware/permission.middleware';
import { detectLang, t } from '../../../shared/i18n';
import { AuthenticatedUser } from '../../../types/authenticated-user.interface';

// using shared prisma singleton
const riskEngine = new RiskEngine();
const sizingCalculator = new PositionSizingCalculator(riskEngine);
const backtestService = new BacktestService();

export function createRiskRoutes(): Router {
  const router = Router();

  router.post('/metrics', permission(['risk:view']), async (req, res, next) => {
    try {
      const { portfolio } = req.body;
      const metrics = riskEngine.computeMetrics(portfolio);
      res.json({ success: true, data: metrics, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  router.post('/position-size', permission(['trade:execute']), async (req, res, next) => {
    try {
      const result = sizingCalculator.compareAll(req.body);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  router.post('/evaluate', permission(['risk:view']), async (req, res, next) => {
    try {
      const { trade, portfolio, dailyPnL } = req.body;
      const result = riskEngine.evaluateTrade(trade, portfolio, dailyPnL);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  return router;
}

export function createBacktestRoutes(): Router {
  const router = Router();

  router.post('/run', permission(['backtest:run']), async (req, res, next) => {
    try {
      const result = await backtestService.runBacktest(req.body);
      logger.info({ id: result.id, symbol: result.symbol, return: result.totalReturn }, 'Backtest completed');

      try {
        await prisma.backtestReport.create({
          data: {
            userId: (req.user as AuthenticatedUser | undefined)?.userId ?? 'anonymous',
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
            equityCurve: result.equityCurve,
            drawdownCurve: result.drawdownCurve,
            monthlyReturns: result.monthlyReturns,
            trades: result.trades as any,
            parameters: result.parameters as any,
          } as any,
        });
      } catch (dbErr) {
        logger.warn({ dbErr }, 'Failed to persist backtest report');
      }

      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  router.get('/history', permission(['backtest:run']), async (req, res, next) => {
    try {
      const user = req.user as AuthenticatedUser | undefined;
      const reports = await prisma.backtestReport.findMany({
        where: { userId: user?.userId ?? '' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      res.json({ success: true, data: reports, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  router.get('/:id', permission(['backtest:run']), async (req, res, next) => {
    try {
      const user = req.user as AuthenticatedUser | undefined;
      const report = await prisma.backtestReport.findFirst({
        where: { id: String(req.params.id), userId: user?.userId ?? '' },
      });
      if (!report) {
        const lang = detectLang(req);
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('backtest.not_found', lang) }, timestamp: new Date().toISOString() });
        return;
      }
      res.json({ success: true, data: report, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  });

  return router;
}
