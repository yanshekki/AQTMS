[English](README.md) | [繁體中文](README.zh.md)

# 🏦 AQTMS — Automated Quantitative Trading Management System

Enterprise-grade fully automated quantitative trading platform — integrating multiple exchanges (CEX + DEX), multiple AI models, multiple data sources, and professional risk control for intelligent unattended trading.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://prisma.io)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-326CE5?logo=kubernetes)](https://kubernetes.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-✅-E6522C?logo=prometheus)](https://prometheus.io)
[![Security Audit](https://img.shields.io/badge/Security-70/70_tests_passed-22c55e)](TEST_WALLETS.md)
[![Progress](https://img.shields.io/badge/Progress-35%25-blue)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 Overview

AQTMS automates the full pipeline: **News Ingestion → AI Verification + Multi-Dimensional Scoring → Strategy Trigger → Unified Trade Execution**.

**Core Value:**
- 🚀 Fully Automated: No manual monitoring — AI judges and executes automatically
- 🧠 Multi-AI Collaboration: Grok verification + Gemini scoring + DeepSeek decision-making + auto-fallback
- 🏦 Multi-Asset: Crypto + HK/US Stocks + DEX unified trading
- 🛡 Professional Risk Control: VaR/CVaR · Kelly · Dynamic Position Sizing · Forced Liquidation Rules
- 📊 Complete Backtesting: Historical data replay + Sharpe/Sortino/Calmar reports
- 🔬 Enterprise Architecture: Hexagonal + DDD + Clean Architecture · Zero `any` types
- 🔒 Security-First: AES-256-GCM · JWT Wallet Auth · Token Invalidation · 5-Role RBAC · Rate Limiting · Ownership Checks
- ☸️ Production-Ready: K8s Helm · Prometheus · Docker Compose · CI/CD

---

## 🎯 Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Exchange Trading** | Binance · Bybit · Futu · IBKR · Uniswap V3 · PancakeSwap · Raydium | ✅ |
| **AI Scoring Engine** | 5-model collaboration (OpenAI/DeepSeek/Grok/Gemini/Ollama) · Composite score 0-100 → auto-trigger trades | ✅ |
| **Risk Management** | VaR 95%/99% · CVaR · Kelly (Full/Half) · Fixed Fractional · Fixed Ratio · ATR · Risk Rule Engine | ✅ |
| **Backtest System** | MA Cross + Score Threshold strategies · Sharpe/Sortino/Calmar · TradingView integration · Monthly returns | ✅ |
| **Data Sources** | Telegram · X.com real-time monitoring · Auto-scoring + signal trigger → Trade Queue · Live price feed | ✅ |
| **Real-time Push** | WebSocket (Socket.io JWT) · 5 event types: price/signal/order/risk/position · Auto-reconnect | ✅ |
| **Monitoring & Alerts** | Prometheus (12 metric types) + Grafana · p95 latency · Trade success rate · Queue health | ✅ |
| **Security & Encryption** | AES-256-GCM API Key encryption · JWT Wallet auth · Redis Token Invalidation · 5-Role RBAC · Rate Limiting (all routes) · Ownership verification (data layer) | ✅ |
| **Scoring Rules** | Configurable weight editor (truth/sentiment/relevance/confidence) · Version history · Enable/Disable toggle · PostgreSQL persisted | ✅ |
| **Notification Center** | In-app notification center · Read/Unread · Filter by type · System seeder · PostgreSQL persisted | ✅ |
| **Container Deployment** | Docker Compose (6 services) · K8s Helm (2 charts) · HPA auto-scaling · Nginx · TLS | ✅ |
| **Team Collaboration** | 5 roles · Permission validation (whitelist) · Audit logs · CSV export · Audit trail | ✅ |
| **Complete Documentation** | Bilingual (EN/ZH) · API docs · Architecture docs · User guide · Test wallets · Permission matrix | ✅ |

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
  ↓ Rate Limiting (all routes)           ← Phase 3 新增
  ↓ CORS (configured)
  ↓ Helmet (security headers)            ← Phase 3 新增
  ↓ Structured Logging + Sentry          ← Phase 3 新增
  ↓ Prometheus Metrics (HTTP + Business) ← Phase 3 新增
  ↓ JWT Auth + Token Invalidation (Redis)
  ↓ Permission Middleware (RBAC)
  ↓ Permission Validation (whitelist)
  ↓ Controller Ownership Checks
  ↓ Repository Ownership Checks
  ↓ Zod Response Validation (Frontend)
  ↓ User-Scoped Data Queries
```

---

## 🚀 Quick Start

### Requirements

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥ 22 | Runtime |
| pnpm | ≥ 10 | Package manager |
| MySQL | ≥ 8 | Primary database |
| Redis | ≥ 7 | Cache, Queue, Session |

### Installation

```bash
# 1. Clone
git clone git@github.com:yanshekki/AQTMS.git aqtms && cd aqtms

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp apps/backend/.env.example apps/backend/.env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY

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
# Start all services (Backend + Frontend + MySQL + Redis + Prometheus + Grafana)
docker-compose up -d

# Access
# Frontend:  http://localhost
# Backend:   http://localhost:3001
# Grafana:   http://localhost:3000 (admin/admin)
# Metrics:   http://localhost:3001/metrics
```

---

## 🏗 Architecture

### Backend — Hexagonal Architecture + DDD + Clean Architecture

```
apps/backend/src/
├── domain/           # Pure domain layer (entities, value-objects, repository interfaces)
├── application/      # Use-case layer (ExecuteTradeUseCase, ProcessNewsUseCase)
├── infrastructure/   # Technical implementation (Prisma, Adapters, BeeQueue, AI Providers)
├── interfaces/       # HTTP/WS boundaries (controllers, dto, middleware, routes)
├── shared/           # Cross-cutting (errors, logger, config, redis, websocket, metrics, i18n)
└── main.ts           # Entry point
```

### Frontend — Feature-Sliced Design + Atomic

```
apps/web/src/
├── app/              # Providers, Router, ErrorBoundary, ProtectedRoute
├── features/         # Business features (exchange-connect, ai-signals)
├── pages/            # Pages (Dashboard, Exchanges, AISignals, Backtest, etc.)
├── components/       # Shared components (layout/Header, ui/)
├── shared/           # api/, lib/, hooks/
└── store/            # Jotai state
```

### Microservice Evolution Path

```
Current: Modular Monolith
  ↓ Phase 3
Extract Data Ingestion + AI Orchestration as independent microservices + NATS
  ↓ Phase 4
Full microservices + K8s + Istio + OpenTelemetry + Saga
```

---

## 📡 API Overview

> Full API documentation: see [docs/api.md](docs/api.md)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/health` | Public | Health check |
| GET | `/metrics` | METRICS_SECRET | Prometheus metrics |
| POST | `/auth/challenge` | Rate-limited | Wallet login challenge |
| POST | `/auth/authenticate` | Rate-limited | Signature verification → JWT |
| GET | `/auth/me` | Authenticated | Current user info |
| POST | `/auth/invalidate` | `admin:user:manage` | Invalidate all tokens for a user |
| GET | `/api/v1/trades` | `trade:read` | List trades (user-scoped) |
| GET | `/api/v1/trades/:id` | `trade:read` | Trade detail (user-scoped) |
| POST | `/api/v1/trades` | `trade:execute` | Place order |
| DELETE | `/api/v1/trades` | `trade:cancel` | Cancel order |
| POST | `/api/v1/exchanges/connect` | `exchange:connect` | Connect exchange (AES-256 encrypted) |
| GET | `/api/v1/exchanges` | `exchange:read` | List exchanges (user-scoped) |
| GET | `/api/v1/exchanges/:id/balance` | `exchange:read` | Exchange balance (ownership-checked) |
| GET | `/api/v1/exchanges/:id/positions` | `exchange:read` | Open positions (ownership-checked) |
| POST | `/api/v1/exchanges/:id/test` | `exchange:connect` | Test connection (ownership-checked) |
| DELETE | `/api/v1/exchanges/:id` | `exchange:connect` | Delete exchange (ownership-checked) |
| GET | `/api/v1/portfolio/summary` | `trade:read` | Portfolio summary (user-scoped) |
| GET | `/api/v1/portfolio/allocation` | `trade:read` | Asset allocation (user-scoped) |
| GET | `/api/v1/portfolio/performance` | `trade:read` | Performance history (user-scoped) |
| GET | `/api/v1/portfolio/holdings` | `trade:read` | Holdings detail (user-scoped) |
| POST | `/api/v1/risk/metrics` | `risk:view` | Calculate risk metrics |
| POST | `/api/v1/risk/position-size` | `trade:execute` | Position sizing (4 algorithms) |
| POST | `/api/v1/risk/evaluate` | `risk:view` | Pre-trade risk check |
| POST | `/api/v1/backtest/run` | `backtest:run` | Run backtest |
| GET | `/api/v1/backtest/history` | `backtest:run` | Backtest history (user-scoped) |
| GET | `/api/v1/backtest/:id` | `backtest:run` | Backtest detail (user-scoped) |
| GET | `/api/v1/scoring-rules` | `scoring:manage` | List scoring rules (user-scoped) |
| POST | `/api/v1/scoring-rules` | `scoring:manage` | Create rule |
| PUT | `/api/v1/scoring-rules/:id` | `scoring:manage` | Update rule (version history) |
| DELETE | `/api/v1/scoring-rules/:id` | `scoring:manage` | Delete rule (user-scoped) |
| GET | `/api/v1/notifications` | `user:read` | List notifications (user-scoped) |
| PUT | `/api/v1/notifications/:id/read` | `user:read` | Mark as read |
| PUT | `/api/v1/notifications/read-all` | `user:read` | Mark all read |
| GET | `/api/v1/ai/providers` | `ai:read` | AI Provider status |
| GET | `/api/v1/news/recent` | `ai:read` | Latest AI-scored news |
| GET | `/api/v1/news/:id` | `ai:read` | News detail |
| GET | `/api/v1/audit/export` | `audit:export` | Audit log CSV download |

> **33 endpoints total** — all with permission middleware, rate limiting, and user-scoping where applicable.

---

## 🛠 Tech Stack

### Backend
| Category | Technology |
|----------|------------|
| Runtime | Node.js 22 + TypeScript 5.4 (strict) |
| Framework | Express 5 |
| Database | Prisma 5 + MySQL 8 |
| Cache | Redis 7 (ioredis) |
| Queue | Bee-Queue (3 queues) |
| Auth | JWT + EIP-191 Wallet Signature |
| Validation | Zod (all inputs/outputs) |
| AI | OpenAI · DeepSeek · Grok · Gemini · Ollama |
| Monitoring | Prometheus + Prom-client (12 metric types) |
| WebSocket | Socket.io (JWT auth + 5 event types) |
| Security | Helmet · AES-256-GCM · Rate Limiting (all routes) · RBAC (5 roles × 16 permissions) · Token Invalidation | 
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
| Monitoring | Prometheus + Grafana |
| E2E Testing | Playwright (12 test cases) |

---

## 🐳 Deployment

### PM2 Process Manager (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start all services (dev mode)
pnpm pm2:start

# Start production mode (builds frontend first)
pm2:start:prod

# Monitor processes
npm2:monit

# View logs
npm2:logs

# Status overview
npm2:status

# Graceful restart (zero downtime)
pm2:reload

# Stop all
npm2:stop

# Save process list for auto-start on boot
npm2:save
npm2:startup
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
- MySQL 8.4 + Redis 7
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

### Backend Unit Tests

```bash
cd apps/backend && pnpm test
```

### Test Coverage

- 🔐 Auth flow (login, redirect)
- 🔑 Permission enforcement (5 roles × 14 endpoints)
- 💱 Exchange connect (form, modal, test, ownership)
- 📊 Risk engine (metrics, position size, evaluate)
- 📈 Backtest engine (run, history, detail, user-scoped)
- 📋 Scoring rules (CRUD, version history, toggle, user-scoped)
- 🔔 Notifications (list, mark read, user-scoped)
- 🩺 API health + Prometheus metrics
- 📋 Audit CSV export
- 🛡 Data isolation (user-scoped queries, ownership checks)

---

## 📊 Database Schema

```
User (id, walletAddress, role, permissions)
ExchangeAccount (id, userId, exchange, apiKey🛡️, apiSecret🛡️)
Trade (id, userId, symbol, side, type, status, idempotencyKey)
AuditLog (id, userId, action, resource, resourceId, ip)
NewsEvent (id, source, content, compositeScore, aiAnalysis)
BacktestReport (id, userId, symbol, totalReturn, sharpeRatio, equityCurve)
ScoringRule (id, userId, name, weights, threshold, action, enabled, versions)
Notification (id, userId, type, title, message, read, targetRoute)
```

> 🔒 `apiKey`/`apiSecret` stored with AES-256-GCM encryption
> 🔒 All queries user-scoped with ownership verification at data layer

---

## 📂 Project Structure

```
aqtms/
├── apps/
│   ├── backend/          # Express 5 + Hexagonal Architecture
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
├── README.md             # English
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
- [ ] Code follows project style
- [ ] No `any` types
- [ ] Permissions handled at Route / Middleware level
- [ ] API I/O validated with Zod
- [ ] Errors use AppError
- [ ] Data queries are user-scoped (where applicable)
- [ ] Ownership verified in data layer (where applicable)
- [ ] No cross-layer architecture violations

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
| **Investor** | 5 minutes | Understand project value | Read README overview + Core Features table |
| **User** | 10 minutes | Complete first trade | Login → Exchange Connect → View AI Signals → Backtest |
| **Auditor** | 5 minutes | Verify security | `node test-full.cjs` → 70/70 passed + review permission matrix |

---

---

**AQTMS — Let AI trade for you.** 🤖📈

<sub>Powered by [YSK Limited](https://ysk.hk/) — Hong Kong Remote Dev Team & Enterprise Solutions</sub>
