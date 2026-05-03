// ── Notifications Routes ──
// In-memory notification store for MVP.

import { Router } from 'express';
import { permission } from '../middleware/permission.middleware';
import { detectLang, t } from '../../../shared/i18n';

export function createNotificationsRoutes(): Router {
  const router = Router();

  let notifications = [
    { id: '1', type: 'trade', title: 'Order Filled — BTC/USDT', message: 'Buy 0.01 BTC @ $50,200.00', time: new Date(Date.now() - 120000).toISOString(), read: false, targetRoute: '/trades' },
    { id: '2', type: 'signal', title: 'High Signal Detected — BTC', message: 'AI composite score 87/100 from Telegram source. Suggested: BUY.', time: new Date(Date.now() - 900000).toISOString(), read: false, targetRoute: '/ai-signals' },
    { id: '3', type: 'risk', title: 'Risk Alert — Concentration Warning', message: 'BTC allocation at 45% exceeds recommended 25% limit.', time: new Date(Date.now() - 3600000).toISOString(), read: true, targetRoute: '/risk' },
    { id: '4', type: 'system', title: 'Exchange Connected — Binance', message: 'API connection test passed. Balance: $5,000 USDT.', time: new Date(Date.now() - 7200000).toISOString(), read: true, targetRoute: '/exchanges' },
    { id: '5', type: 'signal', title: 'AI Signal — ETH/USDT', message: 'Composite score 72/100. Below threshold — not trading.', time: new Date(Date.now() - 10800000).toISOString(), read: true, targetRoute: '/ai-signals' },
    { id: '6', type: 'trade', title: 'Order Cancelled — SOL/USDT', message: 'Cancelled limit sell 5 SOL @ $180. Reason: Risk limit exceeded.', time: new Date(Date.now() - 14400000).toISOString(), read: false, targetRoute: '/trades' },
    { id: '7', type: 'risk', title: 'VaR Breach Warning', message: 'Daily VaR 95%: $2,100 exceeds $2,000 limit. Reduce position or hedge.', time: new Date(Date.now() - 21600000).toISOString(), read: false, targetRoute: '/risk' },
    { id: '8', type: 'trade', title: 'Order Filled — AVAX/USDT', message: 'Sell 10 AVAX @ $35.50. P&L: +$55.00', time: new Date(Date.now() - 28800000).toISOString(), read: true, targetRoute: '/trades' },
    { id: '9', type: 'system', title: 'System Update', message: 'AQTMS v1.0 deployed. Scoring engine: multi-AI pipeline active.', time: new Date(Date.now() - 86400000).toISOString(), read: true, targetRoute: '/dashboard' },
    { id: '10', type: 'signal', title: 'AI Signal — BTC/USDT', message: 'Composite score 65/100 from X source. Sentiment: Bullish, Relevance: Medium.', time: new Date(Date.now() - 172800000).toISOString(), read: true, targetRoute: '/ai-signals' },
  ];

  router.get('/', permission(['user:read']), async (_req, res) => {
    res.json({ success: true, data: notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()), timestamp: new Date().toISOString() });
  });

  router.put('/:id/read', permission(['user:read']), async (req, res) => {
    const n = notifications.find((n) => n.id === String(req.params.id));
    if (!n) {
      const lang = detectLang(req);
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('notification.not_found', lang) }, timestamp: new Date().toISOString() });
      return;
    }
    n.read = true;
    res.json({ success: true, data: n, timestamp: new Date().toISOString() });
  });

  router.put('/read-all', permission(['user:read']), async (_req, res) => {
    notifications.forEach((n) => { n.read = true; });
    res.json({ success: true, data: { allRead: true }, timestamp: new Date().toISOString() });
  });

  return router;
}
