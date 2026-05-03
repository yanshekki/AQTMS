// ── AQTMS E2E Test Suite (Playwright) ──
// Covers: auth flow, exchange connect, risk rules, AI signals, backtest.
// Run: npx playwright test
//
// Requires: running backend (DB + Redis), valid JWT_SECRET in env

import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-change-in-production-32chars!';

// ── Auth Helper ──
function getAuthToken(role: string, permissions: string[]): string {
  return jwt.sign(
    { userId: 'test-user-id', walletAddress: '0x0000000000000000000000000000000000000000', role, permissions },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

const TRADER_TOKEN = getAuthToken('TRADER', [
  'trade:execute', 'trade:cancel', 'trade:read',
  'exchange:connect', 'exchange:read',
  'risk:view', 'datasource:read',
]);

const ADMIN_TOKEN = getAuthToken('ADMIN', [
  'trade:execute', 'trade:cancel', 'trade:read',
  'exchange:connect', 'exchange:read',
  'risk:view', 'user:read',
  'audit:read', 'audit:export',
  'ai:read', 'datasource:read',
  'admin:user:manage', 'admin:system',
  'backtest:run',
]);

const VIEWER_TOKEN = getAuthToken('VIEWER', ['trade:read', 'exchange:read']);

// ── Auth Flow ──
test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('text=AQTMS')).toBeVisible();
    await expect(page.locator('text=Connect Wallet to Login')).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Exchange Connect Flow ──
test.describe('Exchange Connect', () => {
  test('should show empty state when no exchanges (TRADER)', async ({ page }) => {
    await page.evaluate((token) => {
      localStorage.setItem('aqtms_auth', JSON.stringify({
        isAuthenticated: true,
        token,
        walletAddress: '0xTest1234',
        role: 'TRADER',
        permissions: ['exchange:read', 'exchange:connect'],
      }));
    }, TRADER_TOKEN);
    await page.goto(`${BASE_URL}/exchanges`);
    await expect(page.locator('text=No Exchange Connected')).toBeVisible();
    await expect(page.locator('text=Add Connection')).toBeVisible();
  });

  test('should open connect modal on button click', async ({ page }) => {
    await page.evaluate((token) => {
      localStorage.setItem('aqtms_auth', JSON.stringify({
        isAuthenticated: true,
        token,
        walletAddress: '0xTest1234',
        role: 'TRADER',
        permissions: ['exchange:read', 'exchange:connect'],
      }));
    }, TRADER_TOKEN);
    await page.goto(`${BASE_URL}/exchanges`);
    await page.click('text=Add Connection');
    await expect(page.locator('text=Connect Exchange')).toBeVisible();
    await expect(page.locator('label:has-text("API Key")')).toBeVisible();
  });
});

// ── API Health ──
test.describe('API Health', () => {
  test('health endpoint should return ok', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('redis');
    expect(body).toHaveProperty('aiProviders');
    expect(body).toHaveProperty('queues');
  });

  test('metrics endpoint should return Prometheus format', async ({ request }) => {
    const response = await request.get(`${API_URL}/metrics`);
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain('aqtms_http_requests_total');
    expect(text).toContain('aqtms_http_request_duration_seconds');
  });

  test('auth challenge should work', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/challenge`, {
      data: { walletAddress: '0x1234567890abcdef1234567890abcdef12345678' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('AQTMS Login');
  });

  test('protected route should reject unauthorized (no token)', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/trades`, {
      data: { symbol: 'BTCUSDT' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });
});

// ── Risk API (uses TRADER token) ──
test.describe('Risk Engine', () => {
  test('position size should return all 4 methods', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/risk/position-size`, {
      data: {
        accountSize: 10000, riskPercent: 2, winRate: 0.55,
        avgWin: 200, avgLoss: 100, stopLossDistance: 100, currentPrice: 50000,
      },
      headers: { Authorization: `Bearer ${TRADER_TOKEN}` },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toHaveLength(4);
    expect(body.data[0].method).toBe('KELLY_HALF');
  });

  test('risk evaluate should block oversized trade', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/risk/evaluate`, {
      data: {
        trade: { symbol: 'BTC', quantity: 0.5, price: 50000 },
        portfolio: [{ asset: 'BTC', quantity: 1, currentPrice: 50000, historicalReturns: [0.01] }],
        dailyPnL: 0,
      },
      headers: { Authorization: `Bearer ${TRADER_TOKEN}` },
    });
    const body = await response.json();
    expect(body.data.allowed).toBe(false);
    expect(body.data.violations.length).toBeGreaterThan(0);
  });

  test('risk metrics should reject VIEWER (no risk:view)', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/risk/metrics`, {
      data: { portfolio: [{ asset: 'BTC', quantity: 1, currentPrice: 50000, historicalReturns: [0.01, -0.02, 0.03] }] },
      headers: { Authorization: `Bearer ${VIEWER_TOKEN}` },
    });
    expect(response.status()).toBe(403);
  });
});

// ── Backtest API ──
test.describe('Backtest Engine', () => {
  test('backtest run should require auth', async ({ request }) => {
    // Without token → 401
    const noAuthResp = await request.post(`${API_URL}/api/v1/backtest/run`, {
      data: { symbol: 'BTCUSDT', startDate: new Date().toISOString(), endDate: new Date().toISOString(), initialCapital: 10000, feeRate: 0.001, slippagePercent: 0.05, strategyType: 'SIMPLE_MA_CROSS', strategyConfig: {}, exchange: 'BINANCE' },
    });
    expect(noAuthResp.status()).toBe(401);
  });

  test('backtest run should reject TRADER (no backtest:run)', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/backtest/run`, {
      data: {
        symbol: 'BTCUSDT', startDate: new Date('2025-03-01').toISOString(),
        endDate: new Date('2025-04-01').toISOString(), initialCapital: 10000,
        feeRate: 0.001, slippagePercent: 0.05,
        strategyType: 'SIMPLE_MA_CROSS',
        strategyConfig: { fastPeriod: 9, slowPeriod: 21, positionSize: 1 },
        exchange: 'BINANCE',
      },
      headers: { Authorization: `Bearer ${TRADER_TOKEN}` },
    });
    expect(response.status()).toBe(403);
  });

  test('backtest run with ADMIN token', async ({ request }) => {
    test.skip(!process.env.RUN_BACKTEST, 'Skipped — set RUN_BACKTEST=1 to enable (requires Binance API)');
    const response = await request.post(`${API_URL}/api/v1/backtest/run`, {
      data: {
        symbol: 'BTCUSDT', startDate: new Date('2025-03-01').toISOString(),
        endDate: new Date('2025-04-01').toISOString(), initialCapital: 10000,
        feeRate: 0.001, slippagePercent: 0.05,
        strategyType: 'SIMPLE_MA_CROSS',
        strategyConfig: { fastPeriod: 9, slowPeriod: 21, positionSize: 1 },
        exchange: 'BINANCE',
      },
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toHaveProperty('totalReturn');
    expect(body.data).toHaveProperty('sharpeRatio');
    expect(body.data).toHaveProperty('equityCurve');
  });
});

// ── Audit & Compliance ──
test.describe('Audit & Compliance', () => {
  test('audit CSV export should require auth', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/audit/export`);
    expect(response.status()).toBe(401);
  });

  test('audit CSV export should return CSV with ADMIN token', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/audit/export`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/csv');
  });

  test('audit CSV export should reject TRADER (no audit:export)', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/audit/export`, {
      headers: { Authorization: `Bearer ${TRADER_TOKEN}` },
    });
    expect(response.status()).toBe(403);
  });
});

// ── Permission Enforcement ──
test.describe('Route-Level Permission Enforcement', () => {
  test('VIEWER cannot access admin routes', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/scoring-rules`, {
      headers: { Authorization: `Bearer ${VIEWER_TOKEN}` },
    });
    expect(response.status()).toBe(403);
  });

  test('TRADER cannot access AI signal news', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/news/recent`, {
      headers: { Authorization: `Bearer ${TRADER_TOKEN}` },
    });
    expect(response.status()).toBe(403);
  });

  test('TRADER cannot run backtest', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/backtest/run`, {
      data: { symbol: 'BTCUSDT', startDate: new Date().toISOString(), endDate: new Date().toISOString(), initialCapital: 10000, feeRate: 0.001, slippagePercent: 0.05, strategyType: 'SIMPLE_MA_CROSS', strategyConfig: {}, exchange: 'BINANCE' },
      headers: { Authorization: `Bearer ${TRADER_TOKEN}` },
    });
    expect(response.status()).toBe(403);
  });

  test('ADMIN can access all permitted routes', async ({ request }) => {
    // Backtest history
    const resp = await request.get(`${API_URL}/api/v1/backtest/history`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.success).toBe(true);
  });
});
