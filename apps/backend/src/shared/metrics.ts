// ── Prometheus Metrics Registry ──

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const metricsRegistry = new Registry();
metricsRegistry.setDefaultLabels({ app: 'aqtms', version: '0.0.1' });

// ── HTTP Metrics ──
export const httpRequestsTotal = new Counter({
  name: 'aqtms_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'aqtms_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

// ── Trade Metrics ──
export const tradesTotal = new Counter({
  name: 'aqtms_trades_total',
  help: 'Total trades executed',
  labelNames: ['exchange', 'side', 'status'],
  registers: [metricsRegistry],
});

export const tradeFailuresTotal = new Counter({
  name: 'aqtms_trade_failures_total',
  help: 'Total trade failures',
  labelNames: ['exchange', 'reason'],
  registers: [metricsRegistry],
});

// ── AI Metrics ──
export const aiCallsTotal = new Counter({
  name: 'aqtms_ai_calls_total',
  help: 'Total AI API calls',
  labelNames: ['provider', 'task'],
  registers: [metricsRegistry],
});

export const aiCallDuration = new Histogram({
  name: 'aqtms_ai_call_duration_seconds',
  help: 'AI call duration',
  labelNames: ['provider', 'task'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [metricsRegistry],
});

export const aiTokensUsed = new Counter({
  name: 'aqtms_ai_tokens_total',
  help: 'Total AI tokens used',
  labelNames: ['provider', 'type'],
  registers: [metricsRegistry],
});

// ── Queue Metrics ──
export const queueJobTotal = new Counter({
  name: 'aqtms_queue_jobs_total',
  help: 'Total queue jobs processed',
  labelNames: ['queue', 'status'],
  registers: [metricsRegistry],
});

export const queueJobDuration = new Histogram({
  name: 'aqtms_queue_job_duration_seconds',
  help: 'Queue job processing duration',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
  registers: [metricsRegistry],
});

// ── Risk Metrics ──
export const riskTriggersTotal = new Counter({
  name: 'aqtms_risk_triggers_total',
  help: 'Total risk rule triggers',
  labelNames: ['rule', 'severity'],
  registers: [metricsRegistry],
});

// ── System Metrics ──
export const systemMemoryGauge = new Gauge({
  name: 'aqtms_system_memory_bytes',
  help: 'System memory usage',
  labelNames: ['type'],
  registers: [metricsRegistry],
});

export const activeUsersGauge = new Gauge({
  name: 'aqtms_active_users',
  help: 'Currently active users',
  registers: [metricsRegistry],
});

export const connectedExchangesGauge = new Gauge({
  name: 'aqtms_connected_exchanges',
  help: 'Number of connected exchanges',
  labelNames: ['exchange'],
  registers: [metricsRegistry],
});
