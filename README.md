[English](README.md) | [繁體中文](README.zh.md)

# 🏦 AQTMS — Automated Quantitative Trading Management System

Enterprise-grade fully automated quantitative trading platform — integrating multiple exchanges (CEX + DEX), multiple AI models, multiple data sources, and professional risk control for intelligent unattended trading.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://prisma.io)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-326CE5?logo=kubernetes)](https://kubernetes.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-✅-E6522C?logo=prometheus)](https://prometheus.io)
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
- ☸️ Production-Ready: K8s Helm · Prometheus · Docker Compose · CI/CD

---

## 🎯 Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Exchange Trading** | Binance · Bybit · Futu · IBKR · Uniswap V3 · PancakeSwap · Raydium | ✅ |
| **AI Scoring Engine** | 5-model collaboration (OpenAI/DeepSeek/Grok/Gemini/Ollama) · Composite score 0-100 → auto-trigger trades | ✅ |
| **Risk Management** | VaR 95%/99% · CVaR · Kelly (Full/Half) · Fixed Fractional · Fixed Ratio · ATR · Risk Rule Engine | ✅ |
| **Backtest System** | MA Cross + Score Threshold strategies · Sharpe/Sortino/Calmar · P&L + Drawdown charts · Monthly returns | ✅ |
| **Data Sources** | Telegram · X.com real-time monitoring · Auto-scoring + signal trigger → Trade Queue | ✅ |
| **Real-time Push** | WebSocket (Socket.io JWT) · 5 event types: price/signal/order/risk/position | ✅ |
| **Monitoring & Alerts** | Prometheus (12 metric types) + Grafana · p95 latency · Trade success rate · Queue health | ✅ |
| **Security & Encryption** | AES-256-GCM API Key encryption · JWT Wallet auth · 5-role RBAC · Rate Limiting | ✅ |
| **Container Deployment** | Docker Compose (6 services) · K8s Helm (2 charts) · HPA auto-scaling · Nginx · TLS | ✅ |
| **Team Collaboration** | 5 roles (Super Admin/Admin/Trader/Analyst/Viewer) · Audit logs · CSV export | ✅ |
| **Complete Documentation** | API docs · Architecture docs · User guide · Demo scripts · Deployment guide · Trade test checklist | ✅ |

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
git clone <repo-url> aqtms && cd aqtms

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
├── pages/            # Pages (Dashboard, Exchanges, AISignals, Backtest)
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

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check + Redis + Queue status |
| GET | `/metrics` | Prometheus metrics |
| POST | `/auth/challenge` | Wallet login challenge |
| POST | `/auth/authenticate` | Signature verification → JWT |
| POST | `/api/v1/trades` | Place order |
| DELETE | `/api/v1/trades` | Cancel order |
| POST | `/api/v1/exchanges/connect` | Connect exchange (AES-256 encrypted) |
| GET | `/api/v1/exchanges` | List connected exchanges |
| POST | `/api/v1/exchanges/:id/test` | Test connection |
| POST | `/api/v1/risk/metrics` | Calculate risk metrics |
| POST | `/api/v1/risk/position-size` | Position sizing (4 algorithms) |
| POST | `/api/v1/risk/evaluate` | Pre-trade risk check |
| POST | `/api/v1/backtest/run` | Run backtest |
| GET | `/api/v1/backtest/history` | Backtest history |
| GET | `/api/v1/ai/providers` | AI Provider status |
| GET | `/api/v1/news/recent` | Latest AI-scored news |
| GET | `/api/v1/audit/export` | Audit log CSV download |

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
| Security | Helmet · AES-256-GCM · Rate Limiting · RBAC |
| i18n | Accept-Language header detection (en / 繁體中文) |

### Frontend
| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript 5.4 (strict) |
| Build | Vite 6 |
| UI | MUI 5 + Tailwind CSS 3 |
| State | @tanstack/react-query + Jotai |
| Charts | Recharts |
| Form | React Hook Form + Zod |
| Auth | Wagmi + WalletConnect + MetaMask |
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
- 💱 Exchange connect (form, modal, test)
- 📊 Risk engine (metrics, position size, evaluate)
- 📈 Backtest engine (run, history, detail)
- 🩺 API health + Prometheus metrics
- 📋 Audit CSV export

---

## 📊 Database Schema

```
User (id, walletAddress, role, permissions)
ExchangeAccount (id, userId, exchange, apiKey🛡️, apiSecret🛡️)
Trade (id, symbol, side, type, status, idempotencyKey)
AuditLog (id, userId, action, resource, resourceId, ip)
NewsEvent (id, source, content, compositeScore, aiAnalysis)
BacktestReport (id, symbol, totalReturn, sharpeRatio, equityCurve)
```

> 🔒 `apiKey`/`apiSecret` stored with AES-256-GCM encryption

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
└── README.md
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
- [ ] No cross-layer architecture violations

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

---

## 🏢 Team

AQTMS is built by a professional quantitative development team. For commercial support or custom development, please contact us.

---

**AQTMS — Let AI trade for you.** 🤖📈
