[English](README.md) | [繁體中文](README.zh.md)

# 🏦 AQTMS — Automated Quantitative Trading Management System

Enterprise-grade fully automated quantitative trading platform — integrating multiple exchanges (CEX + DEX), multiple AI models, multiple data sources, and professional risk control for intelligent unattended trading.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript)](https://www.typescript.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://prisma.io)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-326CE5?logo=kubernetes)](https://kubernetes.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-✅-E6522C?logo=prometheus)](https://prometheus.io)
[![Security Audit](https://img.shields.io/badge/Security-70/70_tests_passed-22c55e)](TEST_WALLETS.md)
[![Progress](https://img.shields.io/badge/Progress-25%25-yellow)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 Overview

AQTMS automates the full pipeline: **News Ingestion → AI Verification + Multi-Dimensional Scoring → Strategy Trigger → Unified Trade Execution**.

**Core Value:**
- 🚀 Fully Automated: No manual monitoring — AI judges and executes automatically
- 🧠 Multi-AI Collaboration: Grok verification + Gemini scoring + DeepSeek decision-making + auto-fallback
- 🏦 Multi-Asset: Crypto + HK/US Stocks + DEX unified trading
- 🛡 Professional Risk Control: VaR/CVaR · Kelly · Dynamic Position Sizing · Forced Liquidation Rules
- 📊 Complete Backtesting: Historical data replay + Sharpe/Sortino/Calmar reports + Strategy Registry + Visualization Reports
- 🔬 Enterprise Architecture: Hexagonal + DDD + Clean Architecture · Zero `any` types
- 🔒 Security-First: AES-256-GCM · JWT Wallet Auth · Token Invalidation · 5-Role RBAC · Rate Limiting · Ownership Checks
- ☸️ Production-Ready: K8s Helm · Prometheus · Docker Compose · CI/CD · Full Observability Stack

**Latest Updates (May 2026):**
- ✅ **Backtest Engine core completed** (Phases 5/7/8): Strategy Interface + Registry, MA Cross / Mean Reversion / Score Threshold strategies, Binance/Bybit historical data integration (klines API + auto ATR), advanced metrics (Sharpe, Sortino, Calmar, Profit Factor, Win Rate, Max DD), self-contained interactive HTML reports with Chart.js + Tailwind + CSV exports. See backtest_engine.ts
- Phase 9 (Live Trading Production Hardening) & Phase 10 (Advanced Risk & Portfolio Management) **planning documents** created (moved to docs/)
- Many historical feature branches exist (phase1-risk-core ... phase10-advanced-risk-portfolio-management) for reference
- **Step 1 + Step 2 in progress**: README updated for accurate status + established Turborepo + pnpm monorepo structure + basic NestJS backend skeleton (apps/backend) + Prisma schema foundation
- **Important Note**: The "Core Features" table and many ✅ below represent the **long-term vision**. Only the Backtest System is currently implemented in code. Other features are planned and will be built incrementally following the project standards (see Standards List). Previous "completed" claims for unimplemented parts have been corrected. Security audit 70/70 and full RBAC are aspirational until backend is built.

---

## 🎯 Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Exchange Trading** | Binance · Bybit · Futu · IBKR · Uniswap V3 · PancakeSwap · Raydium | ⏳ Planned |
| **AI Scoring Engine** | 5-model collaboration (OpenAI/DeepSeek/Grok/Gemini/Ollama) · Composite score 0-100 → auto-trigger trades | ⏳ Planned |
| **Risk Management** | VaR 95%/99% · CVaR · Kelly (Full/Half) · Fixed Fractional · Fixed Ratio · ATR · Risk Rule Engine + Pre-trade Evaluation | ⏳ Planned (Phase 1/10) |
| **Paper Trading Mode** | Full simulation engine with virtual balance (persisted in DB), slippage, fees, partial fills, real-time PnL via MarketDataService + WebSocket | ⏳ Planned (Phase 4) |
| **Backtest System** | MA Cross + Mean Reversion + Score Threshold strategies · Strategy Registry + Interface · Sharpe/Sortino/Calmar/Profit Factor/Win Rate/Max DD · Historical data from Binance/Bybit · Visualization reports (equity, drawdown, trades) | ✅ (Phase 5 implemented) |
| **Data Sources** | Telegram · X.com real-time monitoring · Auto-scoring + signal trigger → Trade Queue · Live price feed (WebSocket + REST fallback) | ⏳ Planned |
| **Real-time Push** | WebSocket (Socket.io JWT) · 5 event types: price/signal/order/risk/position · Auto-reconnect + Metrics | ⏳ Planned |
| **Monitoring & Alerts** | Prometheus (12+ metric types including execution delay, partial fills, risk checks) + Grafana · p95 latency · Trade success rate · Queue health · Kill Switch status | ⏳ Planned |
| **Security & Encryption** | AES-256-GCM API Key encryption · JWT Wallet auth · Redis Token Invalidation · 5-Role RBAC · Rate Limiting (all routes) · Ownership verification (data layer) · Helmet + Graceful Shutdown | ⏳ Planned |
| **Scoring Rules** | Configurable weight editor (truth/sentiment/relevance/confidence) · Version history · Enable/Disable toggle · PostgreSQL persisted | ⏳ Planned |
| **Notification Center** | In-app notification center · Read/Unread · Filter by type · System seeder · PostgreSQL persisted | ⏳ Planned |
| **Container Deployment** | Docker Compose (6 services) · K8s Helm (2 charts) · HPA auto-scaling · Nginx · TLS · PM2 clustering | ⏳ Planned |
| **Team Collaboration** | 5 roles · Permission validation (whitelist) · Audit logs · CSV export · Audit trail | ⏳ Planned |
| **Complete Documentation** | Bilingual (EN/ZH) · API docs (Swagger) · Architecture docs · User guide · Test wallets · Permission matrix · Standards List | ✅ (in progress) |

---

## 🔐 Permission System

AQTMS implements a comprehensive **Role-Based Access Control (RBAC)** system with 5 roles and 16 fine-grained permissions.

| Role | Permissions | Access |
|------|------------|--------|
| 👑 **SUPER_ADMIN** | All 16 permissions | All pages + system config |
| 🔧 **ADMIN** | 15 permissions (no `risk:manage`) | All pages + user/audit management |
| 💹 **TRADER** | 8 permissions | Dashboard, Exchanges, Trades, Portfolio, Risk, Notifications, Settings |
| 📊 **ANALYST** | 10 permissions | + AI Signals, Backtest, Scoring Rules |
| 👀 **VIEWER** | 3 permissions (`trade:read`, `exchange:read`, `user:read`) | Dashboard, Trades, Portfolio, Notifications, Settings |

### Permission Matrix

| Permission | SUPER | ADMIN | TRADER | ANALYST | VIEWER |
|---|---|---|---|---|---|
| `trade:execute` | ✅ | ✅ | ✅ | | |
| `trade:cancel` | ✅ | ✅ | ✅ | | |
| `trade:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `exchange:connect` | ✅ | ✅ | ✅ | | |
| `exchange:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `risk:view` | ✅ | ✅ | ✅ | ✅ | |
| `risk:manage` | ✅ | | | | |
| `ai:read` | ✅ | ✅ | | ✅ | |
| `datasource:read` | ✅ | ✅ | ✅ | ✅ | |
| `scoring:manage` | ✅ | ✅ | | ✅ | |
| `backtest:run` | ✅ | ✅ | | ✅ | |
| `audit:read` | ✅ | ✅ | | ✅ | |
| `audit:export` | ✅ | ✅ | | | |
| `admin:user:manage` | ✅ | ✅ | | | |
| `admin:system` | ✅ | ✅ | | | |

> 🔒 **Security verified**: 70/70 automated permission tests passed across all 5 roles × 14 endpoints.
> See [TEST_WALLETS.md](TEST_WALLETS.md) for test wallets and verification steps.

### Security Architecture

```
Request
  ↓ Rate Limiting (all routes)
  ↓ CORS (configured)
  ↓ Helmet (security headers)
  ↓ JWT Auth + Token Invalidation (Redis)
  ↓ Permission Middleware (RBAC)
  ↓ Permission Validation (whitelist)
  ↓ Controller Ownership Checks
  ↓ Repository Ownership Checks
  ↓ Zod Response Validation (Frontend)
  ↓ User-Scoped Data Queries
```

---

## 🆕 Standards List (核心標準清單)

> **All contributions must strictly follow these standards.**

The full detailed Standards List has been moved to a dedicated document for better readability and maintenance (pagination approach).

**📄 Full Standards List**:
- [English Version → docs/standards.md](docs/standards.md)
- [繁體中文版本 → docs/standards.zh.md](docs/standards.zh.md)

**Quick Summary**:
- Hexagonal + DDD + Clean Architecture (Zero `any`)
- AES-256-GCM + JWT + 5-Role RBAC + Rate Limiting
- Prometheus + Grafana + Sentry + Kill Switch
- Prisma + Redis + Full Transaction Support
- Risk-First Principle (Every trade must pass Risk Engine)
- Bilingual Documentation + Conventional Commits + 80%+ Test Coverage

---

## 🚀 Quick Start

### Requirements

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥ 22 | Runtime |
| pnpm | ≥ 10 | Package manager |
| MySQL / PostgreSQL | ≥ 8 | Primary database |
| Redis | ≥ 7 | Cache, Queue, Session |

### Installation (Development)

```bash
# 1. Clone
git clone git@github.com:yanshekki/AQTMS.git aqtms && cd aqtms

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp apps/backend/.env.example apps/backend/.env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY (AES-256-GCM)

# 4. Initialize database
cd apps/backend && npx prisma db push && cd ../..

# 5. Start (development mode)
# Backend: http://localhost:3001
cd apps/backend && pnpm dev

# Frontend: http://localhost:5173
cd apps/web && pnpm dev
```

### Using Docker Compose (Full Production Environment)

```bash
# Start all services (Backend + Frontend + MySQL/PostgreSQL + Redis + Prometheus + Grafana)
docker-compose up -d

# Access
# Frontend:  http://localhost
# Backend:   http://localhost:3001
# Grafana:   http://localhost:3000 (admin/admin)
# Metrics:   http://localhost:3001/metrics
```

---

## 🏗 Architecture

### Backend — Hexagonal Architecture + DDD + Clean Architecture (NestJS)

```
apps/backend/src/
├── domain/           # Pure domain layer (entities, value-objects, repository interfaces, business rules)
├── application/      # Use-case layer (ExecuteTradeUseCase, ProcessNewsUseCase, RiskEvaluationUseCase, BacktestUseCase)
├── infrastructure/   # Technical implementation (Prisma repositories, Exchange Adapters, BeeQueue, AI Providers, MarketDataService, PaperTradingService, KillSwitchService, ReconciliationService)
├── interfaces/       # HTTP/WS boundaries (controllers, dto, middleware, routes, guards)
├── shared/           # Cross-cutting (errors, logger, config, redis, websocket, metrics, i18n, execution metrics collector)
└── main.ts           # Entry point (AppModule registration)
```

**Key Services Implemented (Latest):**
- `PaperTradingService`: Virtual balance, slippage, fees, partial fills, DB persistence
- `MarketDataService`: Price cache + WebSocket subscription (Binance miniTicker)
- `KillSwitchService`: Global emergency stop with daily PnL tracking from Portfolio
- `ReconciliationService`: Exchange position reconciliation
- `ExecutionService`: Order execution with risk check first, partial fill support, status machine
- `OrderService`: Order lifecycle management
- `ExecutionLoggerService` + `ExecutionMetricsCollector`: Detailed timing + metrics
- `BacktestService`: Strategy registry, historical data loader (Binance/Bybit), full metrics + visualization data
- `RiskService`: VaR, position sizing, pre-trade evaluation, rule engine

### Frontend — Feature-Sliced Design + Atomic

```
apps/web/src/
├── app/              # Providers, Router, ErrorBoundary, ProtectedRoute
├── features/         # Business features (exchange-connect, ai-signals, data-sources, portfolio, backtest)
├── pages/            # Pages (Dashboard, Exchanges, AISignals, Backtest, Portfolio, etc.)
├── components/       # Shared components (layout/Header, ui/, ExchangeCard, DetailDrawer)
├── shared/           # api/, lib/, hooks/, useExchangeConnection, dataSourceApi
└── store/            # Jotai state
```

---

## 📡 API Overview

> Full API documentation: see [docs/api.md](docs/api.md) or Swagger UI at `/api/docs`

**33+ endpoints total** — all with permission middleware, rate limiting, Zod validation, and user-scoping/ownership checks where applicable.

Key recent additions (Phase 5+):
- Full order lifecycle endpoints with status updates and partial fill support
- Execution metrics and logger query endpoints (for monitoring & debugging)
- Enhanced backtest endpoints returning equity curve + trade details + metrics for visualization reports
- Risk evaluate + position-size with 4 algorithms (Kelly, Fixed Fractional, ATR-based, etc.)

---

## 🛠 Tech Stack

### Backend
| Category | Technology |
|----------|------------|
| Runtime | Node.js 22 + TypeScript 5.4 (strict) |
| Framework | **NestJS 10** (Hexagonal + DDD + Clean Architecture) |
| Database | Prisma 5 + MySQL 8 / PostgreSQL |
| Cache / Queue | Redis 7 (ioredis) + Bee-Queue (3+ queues) |
| Auth | JWT + EIP-191 Wallet Signature |
| Validation | Zod (all inputs/outputs) |
| AI | OpenAI · DeepSeek · Grok · Gemini · Ollama |
| Monitoring | Prometheus + Prom-client (12+ metric types incl. execution delay, partial fills) |
| WebSocket | Socket.io (JWT auth + 5 event types + metrics) |
| Security | Helmet · AES-256-GCM · Rate Limiting (all routes) · RBAC (5 roles × 16 permissions) · Token Invalidation · Ownership Checks |
| i18n | Accept-Language header detection (English / 繁體中文) |

### Frontend
| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript 5.4 (strict) |
| Build | Vite 6 |
| UI | MUI 5 + Emotion |
| State | @tanstack/react-query + Jotai |
| Charts | Recharts + TradingView Lightweight Charts |
| Form | React Hook Form + Zod |
| Auth | Wagmi + WalletConnect + MetaMask |
| WebSocket | Socket.io-client (JWT auth handshake) |
| i18n | react-i18next (English / 繁體中文) |
| Testing | Vitest + React Testing Library + MSW |

### DevOps
| Category | Technology |
|----------|------------|
| CI/CD | GitHub Actions (lint → test → build → docker) |
| Container | Docker + Docker Compose (6 services) |
| Orchestration | Kubernetes + Helm (2 charts) |
| Monitoring | Prometheus + Grafana + Sentry |
| E2E Testing | Playwright (12+ test cases) |
| Process Mgmt | PM2 (clustering, zero-downtime reload) |

---

## 🐳 Deployment

### PM2 Process Manager (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start all services (dev mode)
pnpm pm2:start

# Start production mode (builds frontend first)
pnpm pm2:start:prod

# Monitor processes
pnpm pm2:monit

# View logs
pnpm pm2:logs

# Status overview
pnpm pm2:status

# Graceful restart (zero downtime)
pnpm pm2:reload

# Stop all
pnpm pm2:stop

# Save process list for auto-start on boot
pnpm pm2:save
pnpm pm2:startup
```

#### PM2 Process List

| Process | Port | Mode | Memory Limit |
|---------|------|------|-------------|
| `aqtms-backend` | 3001 | fork | 512M |
| `aqtms-frontend-dev` | 5173 | fork | 256M |
| `aqtms-frontend` | 5173 | fork | 128M |

> 📁 Full config: `ecosystem.config.cjs`

### Docker Compose (Dev / Small Production)

```bash
docker-compose up -d
```

- Backend ×2 replicas
- Frontend ×1 (Nginx + SPA)
- MySQL 8.4 / PostgreSQL + Redis 7
- Prometheus + Grafana

### Kubernetes (Production)

```bash
# Backend (with HPA auto-scaling)
helm install aqtms-backend ./infra/helm/backend -f values-prod.yaml

# Frontend (with TLS)
helm install aqtms-frontend ./infra/helm/frontend -f values-prod.yaml
```

> Full deployment guide: see [docs/deployment.md](docs/deployment.md)

---

## 🧪 Testing

### Permission Audit Tests

```bash
cd apps/backend && node test-full.cjs
# 70/70 permission tests across 5 roles × 14 endpoints ✅
```

### E2E Tests (Playwright)

```bash
cd e2e && npx playwright test
```

### Backend Unit & Integration Tests

```bash
cd apps/backend && pnpm test
```

### Test Coverage Highlights
- 🔐 Auth flow + Permission enforcement (5 roles × 14+ endpoints)
- 💱 Exchange connect (form, modal, test, ownership)
- 📊 Risk engine (metrics, position size 4 algos, evaluate)
- 📈 Backtest engine (run, history, detail, user-scoped, visualization data)
- 📋 Scoring rules (CRUD, version history, toggle, user-scoped)
- 🔔 Notifications (list, mark read, user-scoped)
- 🩺 API health + Prometheus metrics + Execution metrics
- 📋 Audit CSV export
- 🛡 Data isolation (user-scoped queries, ownership checks at controller + repo layer)
- 📦 Paper Trading full flow (persistence, slippage, fees, partial fills, PnL)
- ⚙️ Order execution lifecycle + partial fills + reconciliation

---

## 📊 Database Schema (Prisma)

```
User (id, walletAddress, role, permissions)
ExchangeAccount (id, userId, exchange, apiKey🛡️, apiSecret🛡️, isPaperTrading, paperVirtualBalance)
Trade (id, userId, symbol, side, type, status, idempotencyKey, isPaper)
AuditLog (id, userId, action, resource, resourceId, ip)
NewsEvent (id, source, content, compositeScore, aiAnalysis)
BacktestReport (id, userId, symbol, totalReturn, sharpeRatio, equityCurve, maxDrawdown, profitFactor, winRate, trades)
ScoringRule (id, userId, name, weights, threshold, action, enabled, versions)
Notification (id, userId, type, title, message, read, targetRoute)
ExecutionLog (id, orderId, timestamp, stage, durationMs, metadata)
```

> 🔒 `apiKey`/`apiSecret` stored with AES-256-GCM encryption
> 🔒 All queries user-scoped with ownership verification at data layer
> 🔒 Paper trading uses separate `isPaper` flag + virtual balance column

---

## 📂 Project Structure

```
aqtms/
├── apps/
│   ├── backend/          # NestJS + Hexagonal Architecture (domain / application / infrastructure / interfaces)
│   └── web/              # React 18 + Feature-Sliced Design
├── packages/
│   └── shared-types/     # Zod schemas + TypeScript types
├── infra/
│   └── helm/             # K8s Helm charts (backend + frontend)
├── e2e/                  # Playwright E2E tests
├── docs/                 # Architecture, API, Deployment docs
├── .github/
│   └── workflows/        # CI/CD pipeline
├── docker-compose.yml    # 6-service deployment
├── prometheus.yml        # Prometheus scrape config
├── pnpm-workspace.yaml
├── turbo.json
├── TEST_WALLETS.md       # Test wallet addresses + permission matrix
├── README.md             # English (this file)
└── README.zh.md          # 繁體中文
```

---

## 🤝 Contributing

Contributions are welcome! Whether it's a Bug Report, Feature Request, or PR.

### How to Contribute

1. **Fork** this repository
2. **Create a Branch**: `git checkout -b feat/amazing-feature`
3. **Commit**: `git commit -m 'feat: add amazing feature'`
4. **Push**: `git push origin feat/amazing-feature`
5. **Open a Pull Request** → fill in the PR Template

### Issue Templates

| Template | Purpose |
|----------|---------|
| 🐛 [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) | Report a bug |
| ✨ [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) | Suggest a feature |
| ❓ [Question](.github/ISSUE_TEMPLATE/question.md) | General questions |

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation update
- `perf:` Performance improvement
- `test:` Testing related
- `chore:` Build/dependencies

### PR Checklist

Before submitting a PR, please confirm:
- [ ] Code follows project style (NestJS Hexagonal + DDD)
- [ ] No `any` types
- [ ] Permissions handled at Route / Middleware level
- [ ] API I/O validated with Zod
- [ ] Errors use AppError / BaseExceptionFilter
- [ ] Data queries are user-scoped (where applicable)
- [ ] Ownership verified in data layer (where applicable)
- [ ] No cross-layer architecture violations
- [ ] Tests added/updated for new features

---

## 👤 Creator

**Ki (yanshekki)** — Full-stack developer, quant trader, founder of [YSK Limited](https://ysk.hk/).

🌐 [linktr.ee/yanshekki](https://linktr.ee/yanshekki) · 🏢 [ysk.hk](https://ysk.hk/)

### ☕ Support / Donate

If AQTMS helps you, consider buying me a coffee!

| Network | Address |
|---------|---------|
| **EVM** (ETH/BSC/Polygon) | `yanshekki.eth` |
| **NEAR** | `yanshekki.near` |
| **ADA** (Cardano) | `$yanshekki` |

<p align="center">
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://linktr.ee/yanshekki" alt="yanshekki QR" width="200" />
  <br/>
  <sub>Scan to support → linktr.ee/yanshekki</sub>
</p>

---

## 📄 License
MIT © AQTMS

---

## ✅ Acceptance Criteria

| Audience | Time | Goal | How |
|----------|------|------|-----|
| **Developer** | 30 minutes | Successfully start the project | `pnpm install` → `cp .env.example .env` → `prisma db push` → `pnpm dev` |
| **Investor** | 5 minutes | Understand project value | Read README overview + Core Features table + Standards List |
| **User** | 10 minutes | Complete first trade | Login → Exchange Connect → View AI Signals → Run Backtest → Place Paper Trade |
| **Auditor** | 5 minutes | Verify security | `node test-full.cjs` → 70/70 passed + review permission matrix + Standards List |

---

**AQTMS — Let AI trade for you.** 🤖📈

<sub>Powered by [YSK Limited](https://ysk.hk/) — Hong Kong Remote Dev Team & Enterprise Solutions</sub>

---

*This README has been updated (Step 1) to reflect **actual implementation status** as of May 2026. Only the Backtest Engine (Phases 5/7/8) is fully coded. Phase 9/10 were planning docs only (now in docs/). Monorepo + NestJS skeleton + Prisma started in this branch (Step 1+2). All other features are planned/vision. Standards List and architecture principles remain mandatory. Chinese version (README.zh.md) should be synchronized. Moved phase planning docs to docs/ folder.*