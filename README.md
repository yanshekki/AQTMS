# 🏦 AQTMS — Automated Quantitative Trading Management System

**Enterprise-grade fully automated quantitative trading platform**

Integrating multiple exchanges (CEX + DEX), multiple AI models, multiple data sources, and professional risk control for intelligent unattended trading.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript)](https://www.typescript.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://prisma.io)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-326CE5?logo=kubernetes)](https://kubernetes.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-✅-E6522C?logo=prometheus)](https://prometheus.io)
[![Security Audit](https://img.shields.io/badge/Security-70/70_tests_passed-22c55e)](TEST_WALLETS.md)
[![Progress](https://img.shields.io/badge/Progress-95%25-brightgreen)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh.md)

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

**Current Status (May 2026 - Step 11+ Complete):**
- ✅ **Backtest Engine** fully implemented (Phases 5-8)
- ✅ **Backend Core (NestJS)**: Hexagonal + DDD, Prisma rich models, JWT+wallet auth, ccxt, full Execution/Risk/PaperTrading/Order/Portfolio/Safety services
- ✅ **BullMQ Unified Queue Architecture**: Portfolio snapshots on BullMQ
- ✅ **Live Trading Hardening & WebSocket**: Order/position real-time push, partial fill support, reconciliation, Kill Switch
- ✅ **Real Portfolio & Dashboard Integration**: Full real getPositions (live/paper/DB fallback), createSnapshot, getSnapshots; Dashboard fully connected with live charts + real-time WS
- ✅ **Advanced Safety & Monitoring**: Max open positions, cooldown, circuit breaker, Grafana panels for execution delay, partial fills, risk alerts
- ✅ **E2E Real Trading Test**: Paper → Live flow validated
- ✅ **Deployment & Observability**: Docker Compose, ecosystem.config, prometheus.yml, infra/helm + Grafana dashboards perfected

---

## 🎯 Core Features (Current Implementation)

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Exchange Trading** | Binance, Bybit (ccxt) + paper/real with partial fills | ✅ Implemented |
| **Risk Management & Safety** | Pre-trade eval, sizing, daily limits, Kill Switch, circuit breakers, persisted rules | ✅ Implemented |
| **Order & Execution Engine** | Full lifecycle, stop/takeprofit, real exchangeOrderId, reconcile | ✅ Implemented |
| **BullMQ Queues** | Unified BullMQ for snapshots + automation | ✅ Core done |
| **Real-time Updates** | WebSocket Gateway for order/position/partial-fill/killswitch push | ✅ Implemented |
| **Portfolio & Automation** | Real getPositions/createSnapshot/getSnapshots + BullMQ snapshot automation | ✅ Fully Real |
| **Backtest System** | Full strategy registry, historical data, metrics, HTML reports | ✅ Fully Implemented |
| **Authentication & Security** | Wallet signature, JWT, RBAC, AES | ✅ Implemented |
| **Frontend Dashboard** | React + Recharts + real-time WebSocket + live PnL/positions/killswitch + real API | ✅ Complete |
| **Deployment & Monitoring** | Docker, Helm, Prometheus + Grafana (execution delay, partial fills, risk alerts) | ✅ Perfected |

---

## 🛠 Tech Stack

**Backend**: Node.js 22 + TS, NestJS 10 (Hex + DDD), Prisma, Redis + BullMQ + @nestjs/bullmq/schedule/websockets

**Frontend**: React 18 + Vite + TanStack Query + Recharts + Socket.io-client + MUI

**DevOps**: pnpm + Turborepo, Docker, K8s Helm, PM2, Prometheus + Grafana

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone git@github.com:yanshekki/AQTMS.git aqtms && cd aqtms

# 2. Install
pnpm install

# 3. Setup
cp apps/backend/.env.example apps/backend/.env

# 4. Start
cd apps/backend && pnpm dev
cd apps/web && pnpm dev
```

---

## 👤 Creator

**Ki (yanshekki)** — Full-stack developer, quant trader, founder of [YSK Limited](https://ysk.hk/).

🌐 [linktr.ee/yanshekki](https://linktr.ee/yanshekki) · 🏢 [ysk.hk](https://ysk.hk/)

### ☕ Support / Donate

If AQTMS helps you, consider buying me a coffee!

| Network | Address |
|---------|---------|
| **EVM** (ETH/BSC/AVAX) | `yanshekki.eth` |
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

<sub>Powered by [YSK Limited](https://ysk.hk/) — Hong Kong Remote Dev Team & Enterprise Solutions</sub>

---

*README updated to reflect actual implementation status as of May 2026 (Step 11+ complete). All core features production-ready.*
