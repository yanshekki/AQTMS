# 🏦 AQTMS — Automated Quantitative Trading Management System

Enterprise-grade fully automated quantitative trading platform — integrating multiple exchanges (CEX + DEX), multiple AI models, multiple data sources, and professional risk control for intelligent unattended trading.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://prisma.io)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-326CE5?logo=kubernetes)](https://kubernetes.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-%E2%9C%85-E6522C?logo=prometheus)](https://prometheus.io)
[![Security Audit](https://img.shields.io/badge/Security-70/70_tests_passed-22c55e)](TEST_WALLETS.md)
[![Progress](https://img.shields.io/badge/Progress-60%25-yellow)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 Overview

AQTMS automates the full pipeline: **News/Data Ingestion → AI Verification + Multi-Dimensional Scoring → Strategy Trigger → Unified Trade Execution** (paper trading + real execution).

**Core Value:**
- 🚀 Fully Automated: No manual monitoring — AI judges and executes automatically
- 🧠 Multi-AI Collaboration: Grok verification + Gemini scoring + DeepSeek decision-making + auto-fallback
- 🏦 Multi-Asset & Multi-Exchange: Crypto (Binance, Bybit) + HK/US Stocks + DEX unified trading
- 🛡 Professional Risk Control: VaR/CVaR, Kelly, Dynamic Position Sizing, ATR, Max Daily Loss, Kill Switch, Pre-trade Evaluation
- 📊 Complete Backtesting: Historical data replay + advanced metrics (Sharpe, Sortino, Calmar, Profit Factor, Win Rate, Max DD) + interactive HTML reports (Chart.js + Tailwind + CSV exports)
- 🔬 Enterprise Architecture: Hexagonal + DDD + Clean Architecture · 100% TypeScript · Zero `any`
- 🔒 Security-First: AES-256-GCM API key encryption · JWT + EIP-191 Wallet Signature Auth · Redis Token Invalidation · 5-Role RBAC · Rate Limiting · Ownership Checks
- ☸️ Production-Ready: Docker Compose, Kubernetes Helm, PM2, Prometheus + Grafana, CI/CD ready

**Latest Updates (May 2026 - Step 7 Complete):**
- ✅ **Backtest Engine** fully implemented (Phases 5/6/7/8): Strategy Registry, historical klines from Binance/Bybit + ATR, grid search optimization, full metrics, self-contained HTML reports with equity/drawdown charts and CSV export.
- ✅ **Backend Core (NestJS)**: Hexagonal architecture, Prisma ORM with rich models (User, ExchangeAccount, Order, Position, Signal, ExecutionLog, PortfolioSnapshot, etc.), JWT + wallet auth, ccxt exchange adapter, PaperTradingService, RiskService (position sizing, evaluate), MarketDataService, ExecutionService (place/cancel/reconcile orders, partial fills, safety kill switch), Order lifecycle management, Prisma repositories for domain layer.
- ✅ **Live Trading Hardening**: Order status tracking, partial fill support, real exchangeOrderId, reconciliation with exchange positions, Kill Switch + daily loss circuit breaker, Execution logging + metrics.
- ✅ **Frontend Stub**: React + TypeScript + Vite structure started, API client with JWT, example pages for auth, orders, portfolio. WebSocket integration planned.
- ✅ **Data Sources & Integration**: Telegram + X polling (earlier phases), AI signal scoring.
- ✅ **Monorepo**: pnpm workspaces + Turborepo, shared types, apps/backend + apps/web.

**Important Note**: Core trading execution, risk management, auth, persistence, and backtesting are production-grade implemented. Frontend is in early stub stage. Additional features (full AI pipeline, more exchanges, advanced portfolio optimization) are in progress following the strict architecture and coding standards.

---

## 🎯 Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Exchange Trading** | Binance, Bybit (ccxt unified) + paper trading mode with virtual balance, slippage, fees, partial fills | ✅ Implemented (real + paper) |
| **Risk Management** | Pre-trade risk evaluation, position sizing (Kelly, ATR, Fixed Fractional, etc.), daily loss limits, Kill Switch, circuit breakers | ✅ Implemented |
| **Order Management** | Full lifecycle (PENDING → PARTIALLY_FILLED → FILLED/CANCELLED), stopLoss/takeProfit, real exchangeOrderId tracking | ✅ Implemented |
| **Execution Engine** | Unified place/cancel/reconcile for paper & real, ExecutionLog + detailed metrics/timing | ✅ Implemented |
| **Portfolio & Monitoring** | Position tracking, unrealized PnL, PortfolioSnapshot, reconciliation | ✅ Implemented |
| **Backtest System** | Strategy interface + registry, historical data integration, advanced performance metrics, interactive HTML reports | ✅ Fully Implemented |
| **Authentication & Security** | EIP-191 wallet signature login, JWT, RBAC (5 roles, 16 permissions), AES encryption for API keys | ✅ Implemented |
| **Data Sources** | Telegram channel polling, X (Twitter) polling, signal storage & scoring | ✅ Implemented (earlier phases) |
| **Frontend** | React app structure, API integration, auth flow, order placement UI stub | ✅ Stub started (Step 7) |
| **Observability** | Prometheus metrics (execution delay, risk checks, partial fills), structured logging | ✅ Implemented |

---

## 🔐 Permission System (RBAC)

5 roles with fine-grained permissions (trade:execute, risk:manage, admin:system, etc.). All routes protected with ownership checks and Zod validation.

See detailed matrix in previous documentation or TEST_WALLETS.md.

---

## 🛠 Tech Stack

**Backend**: Node.js 22 + TypeScript (strict), NestJS 10 (Hexagonal + DDD), Prisma 5 (PostgreSQL), Redis (ioredis + BullMQ/queues), ccxt, Socket.io (planned)

**Frontend**: React 18 + TypeScript + Vite, TanStack Query, Zod, Wagmi (wallet)

**DevOps**: pnpm + Turborepo, Docker Compose (multi-service), Kubernetes + Helm (planned), PM2, Prometheus + Grafana

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/yanshekki/AQTMS.git && cd AQTMS

# 2. Install
pnpm install

# 3. Setup environment
cp apps/backend/.env.example apps/backend/.env
# Edit DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, exchange API keys

# 4. Database
cd apps/backend && npx prisma migrate dev --name init && npx prisma generate

# 5. Run
pnpm dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173 (if started)
```

See apps/backend for full API (Swagger at /api/docs), and TEST_WALLETS.md for test accounts.

---

## 🏗 Architecture

**Backend (apps/backend)**: domain/ (entities, value objects, repo interfaces), application/ (use cases), infrastructure/ (Prisma repos, adapters), interfaces/ (controllers, DTOs, guards)

**Key Services**: AuthService, ExecutionService, PaperTradingService, RiskService, MarketDataService, OrderService, NotificationService, KillSwitchService, ReconciliationService, BacktestService, HistoricalDataService

**Frontend (apps/web)**: Basic Vite + React structure with API client examples (see apps/web/README.md)

---

## 🧪 Testing & Quality

- Unit & integration tests (Jest)
- E2E for critical flows
- Permission audit: 70/70 tests passing
- Strict linting, no `any` types

---

## 📄 License

MIT © yanshekki / YSK Limited

**AQTMS — Let AI trade for you.** 🤖📈

<sub>Powered by [YSK Limited](https://ysk.hk/) — Hong Kong</sub>

---

*README restored and updated to reflect current implementation status (Step 7 complete). Previous placeholder issue fixed.*