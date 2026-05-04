// ── AQTMS Backend Entry Point ──

import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import { loadEnv } from './shared/config';
import { logger } from './shared/logger';
import { prisma } from './shared/prisma';
import { errorMiddleware, authMiddleware } from './interfaces/http/middleware';
import { permission } from './interfaces/http/middleware/permission.middleware';
import { metricsMiddleware } from './interfaces/http/middleware/metrics.middleware';
import { rateLimitMiddleware, authRateLimitMiddleware, strictRateLimitMiddleware } from './interfaces/http/middleware/rate-limit.middleware';
import { detectLang, t } from './shared/i18n';
import { createTradeRoutes } from './interfaces/http/routes/trade.routes';
import { createExchangeRoutes } from './interfaces/http/routes/exchange.routes';
import { createAuthRoutes } from './interfaces/http/routes/auth.routes';
import { createRiskRoutes, createBacktestRoutes } from './interfaces/http/routes/risk-backtest.routes';
import { createPortfolioRoutes } from './interfaces/http/routes/portfolio.routes';
import { createScoringRulesRoutes } from './interfaces/http/routes/scoring-rules.routes';
import { createNotificationsRoutes } from './interfaces/http/routes/notifications.routes';
import { ExecuteTradeUseCase, CancelTradeUseCase } from './application/use-cases';
import { ProcessNewsUseCase } from './application/use-cases/ProcessNewsUseCase';
import { PrismaTradeRepository } from './infrastructure/persistence/PrismaTradeRepository';
import { TelegramAdapter } from './infrastructure/adapters/datasources/TelegramAdapter';
import { XAdapter } from './infrastructure/adapters/datasources/XAdapter';
import { aiProviderRegistry } from './infrastructure/ai-providers/AIProviderRegistry';
import { ScoringEngine } from './application/services/ScoringEngine';
import { initNewsQueue, enqueueNews } from './queues/processors/news.processor';
import { initAIScoringQueue } from './queues/processors/ai.processor';
import { initTradeQueue } from './queues/processors/trade.processor';
import { metricsRegistry } from './shared/metrics';
import { initWebSocket } from './shared/websocket';
import compression from 'compression';
import type { ExchangeAdapterMap } from './application/use-cases';
import { BinanceAdapter } from './infrastructure/adapters/exchanges/BinanceAdapter';
import { BybitAdapter } from './infrastructure/adapters/exchanges/BybitAdapter';
import type { BaseDataSourceAdapter } from './infrastructure/adapters/datasources/BaseDataSourceAdapter';
import { ExchangeAccountRepository } from './infrastructure/persistence/ExchangeAccountRepository';

// ── Load & validate env ──
const env = loadEnv();

// ── Adapter Registry — lazy, credentials resolved per-account from DB ──
// Adapters created on-demand with real decrypted API keys, never hardcoded.
const dataSources: BaseDataSourceAdapter[] = [];

const exchangeAccountRepo = new ExchangeAccountRepository(env.ENCRYPTION_KEY);

const adapterMap: ExchangeAdapterMap = {
  async get(accountId: string, userId: string) {
    const creds = await exchangeAccountRepo.getDecryptedCredentials(accountId, userId);
    if (!creds) return undefined;

    switch (creds.exchange) {
      case 'BINANCE':
        return new BinanceAdapter({ apiKey: creds.apiKey, apiSecret: creds.apiSecret, testnet: creds.testnet });
      case 'BYBIT':
        return new BybitAdapter({ apiKey: creds.apiKey, apiSecret: creds.apiSecret, testnet: creds.testnet });
      default:
        return undefined;
    }
  },
};

// ── Repositories ──
const tradeRepository = new PrismaTradeRepository();

// ── Use-cases ──
const executeTradeUseCase = new ExecuteTradeUseCase(adapterMap, tradeRepository);
const cancelTradeUseCase = new CancelTradeUseCase(adapterMap, tradeRepository);

// ── AI Providers ──
if (process.env.OPENAI_API_KEY) {
  aiProviderRegistry.register('openai-1', 'OPENAI', 'GPT-4o', { apiKey: process.env.OPENAI_API_KEY });
  logger.info('🤖 OpenAI provider registered');
}
if (process.env.DEEPSEEK_API_KEY) {
  aiProviderRegistry.register('deepseek-1', 'DEEPSEEK', 'DeepSeek Chat', { apiKey: process.env.DEEPSEEK_API_KEY });
  logger.info('🤖 DeepSeek provider registered');
}
if (process.env.GROK_API_KEY) {
  aiProviderRegistry.register('grok-1', 'GROK', 'Grok-2', { apiKey: process.env.GROK_API_KEY });
  logger.info('🤖 Grok provider registered');
}
if (process.env.GEMINI_API_KEY) {
  aiProviderRegistry.register('gemini-1', 'GEMINI', 'Gemini Flash', { apiKey: process.env.GEMINI_API_KEY });
  logger.info('🤖 Gemini provider registered');
}
if (process.env.OLLAMA_ENABLED === 'true') {
  aiProviderRegistry.register('ollama-1', 'OLLAMA', 'Llama 3.2 Local', {
    apiKey: 'local',
    baseURL: process.env.OLLAMA_URL ?? 'http://localhost:11434',
  });
  logger.info('🤖 Ollama (local) provider registered');
}

// ── Scoring Engine ──
const scoringEngine = new ScoringEngine(aiProviderRegistry, 80);

// ── News Processing ──
const processNewsUseCase = new ProcessNewsUseCase(scoringEngine);

// ── Queue Initialization ──
initNewsQueue(scoringEngine, processNewsUseCase);
initAIScoringQueue(aiProviderRegistry);
initTradeQueue(executeTradeUseCase);
logger.info('📬 Bee-Queue workers started (news:5, ai:10, trade:3)');

// ── Data Sources ──
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNELS) {
  const telegram = new TelegramAdapter({
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    channelUsernames: process.env.TELEGRAM_CHANNELS.split(','),
  });
  dataSources.push(telegram);

  telegram.startPolling(async (news) => {
    await enqueueNews({
      newsId: news.id,
      source: news.source,
      sourceId: news.sourceId,
      content: news.content,
      retryCount: 0,
      ...(news.channelName ? { channelName: news.channelName } : {}),
    });
  }, 30_000);

  logger.info('📡 Telegram data source polling started');
}

if (process.env.X_BEARER_TOKEN && process.env.X_USERNAMES) {
  const x = new XAdapter({
    bearerToken: process.env.X_BEARER_TOKEN,
    usernames: process.env.X_USERNAMES.split(','),
  });
  dataSources.push(x);

  x.startPolling(async (news) => {
    await enqueueNews({
      newsId: news.id,
      source: news.source,
      sourceId: news.sourceId,
      content: news.content,
      retryCount: 0,
      ...(news.authorName ? { channelName: news.authorName } : {}),
    });
  }, 60_000);

  logger.info('📡 X.com data source polling started');
}

// ── Express App ──
const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(metricsMiddleware);
app.use(rateLimitMiddleware);
app.use(authMiddleware);

// Health check — minimal, no internal details exposed
app.get('/health', async (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    poweredBy: 'YSK Limited — https://ysk.hk/',
    timestamp: new Date().toISOString(),
  });
});

// Prometheus metrics endpoint — authenticated via shared secret
app.get('/metrics', async (req, res) => {
  const metricsSecret = process.env.METRICS_SECRET;
  if (metricsSecret) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${metricsSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }
  res.setHeader('Content-Type', metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});

// API Routes
app.use('/auth', authRateLimitMiddleware, createAuthRoutes());
app.use('/api/v1/trades', strictRateLimitMiddleware, createTradeRoutes(executeTradeUseCase, cancelTradeUseCase));
app.use('/api/v1/exchanges', rateLimitMiddleware, createExchangeRoutes(env.ENCRYPTION_KEY));
app.use('/api/v1/risk', rateLimitMiddleware, createRiskRoutes());
app.use('/api/v1/backtest', rateLimitMiddleware, createBacktestRoutes());
app.use('/api/v1/portfolio', rateLimitMiddleware, createPortfolioRoutes());
app.use('/api/v1/scoring-rules', rateLimitMiddleware, createScoringRulesRoutes());
app.use('/api/v1/notifications', rateLimitMiddleware, createNotificationsRoutes());

// AI & News endpoints
app.get('/api/v1/ai/providers', permission(['ai:read']), (_req, res) => {
  const providers = aiProviderRegistry.getAll().map((p) => ({
    id: p.id,
    type: p.type,
    name: p.name,
    isHealthy: p.isHealthy,
  }));
  res.json({ success: true, data: providers, timestamp: new Date().toISOString() });
});

app.get('/api/v1/news/recent', permission(['ai:read']), async (req, res, next) => {
  try {
    // using shared prisma singleton
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const minScore = parseFloat(req.query.minScore as string) || 0;
    const source = req.query.source as string | undefined;

    const news = await prisma.newsEvent.findMany({
      where: {
        isProcessed: true,
        ...(minScore > 0 ? { compositeScore: { gte: minScore } } : {}),
        ...(source ? { source } : {}),
      },
      orderBy: { processedAt: 'desc' },
      take: limit,
      select: {
        id: true, source: true, channelName: true, content: true,
        truthScore: true, sentimentScore: true, relevanceScore: true,
        compositeScore: true, isFake: true, processedAt: true,
      },
    });
    res.json({ success: true, data: news, timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

// News detail endpoint
app.get('/api/v1/news/:id', permission(['ai:read']), async (req, res, next) => {
  try {
    // using shared prisma singleton
    const news = await prisma.newsEvent.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!news) {
      const lang = detectLang(req);
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('news.not_found', lang) }, timestamp: new Date().toISOString() });
      return;
    }
    res.json({
      success: true,
      data: { ...news, source: news.source, channelName: news.channelName },
      timestamp: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

// Audit log export (CSV)
app.get('/api/v1/audit/export', permission(['audit:export']), async (_req, res, next) => {
  try {
    // using shared prisma singleton
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const csvHeaders = 'id,userId,action,resource,resourceId,ipAddress,createdAt\n';
    const csvRows = logs.map((l) =>
      [l.id, l.userId, l.action, l.resource, l.resourceId ?? '', l.ipAddress ?? '', l.createdAt.toISOString()].join(','),
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send(csvHeaders + csvRows);
  } catch (err) { next(err); }
});

// Global error middleware
app.use(errorMiddleware);

// ── Start ──
const server = http.createServer(app);
initWebSocket(server, env.JWT_SECRET, env.CORS_ORIGIN);

server.listen(env.PORT, () => {
  logger.info(`🚀 AQTMS Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`   🤖 AI Providers: ${aiProviderRegistry.size} (${aiProviderRegistry.getHealthy().length} healthy)`);
  logger.info(`   📡 Data Sources: ${dataSources.length} active`);
  logger.info(`   📊 Scoring Engine: threshold ${80}, multi-AI pipeline ready`);
  logger.info(`   🏢 Powered by YSK Limited — https://ysk.hk/`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down...');
  dataSources.forEach((ds) => ds.stopPolling());
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
