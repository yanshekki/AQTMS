# AQTMS — Automated Quantitative Trading Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**English** | [繁體中文](README.zh.md)

---

## Overview

AQTMS is an **enterprise-grade fully automated quantitative trading platform** that integrates multiple exchanges (CEX + DEX), multiple AI models, multiple data sources, and professional risk control for intelligent unattended trading.

It automates the full pipeline: **News Ingestion → AI Verification + Multi-Dimensional Scoring → Strategy Trigger → Unified Trade Execution**.

### Core Value
- **Fully automated**: No manual monitoring — AI judges and executes automatically.
- **Multi-AI collaboration**: Grok verification + Gemini scoring + DeepSeek decision-making + auto-fallback.
- **Multi-asset**: Crypto + HK/US Stocks + DEX unified trading.
- **Professional risk control**: VaR/CVaR · Kelly · Dynamic Position Sizing · Forced Liquidation Rules.
- **Paper Trading Mode**: Full simulation with virtual balance, slippage, fees, partial fills + real-time PnL (Phase 4).
- **Complete Backtesting**: Historical data replay + Sharpe/Sortino/Calmar reports.
- **Enterprise Architecture**: Hexagonal + DDD + Clean Architecture · Zero `any` types.
- **Security-First**: AES-256-GCM · JWT Wallet Auth · Token Invalidation · 5-Role RBAC · Rate Limiting · Ownership Checks.
- **Production-Ready**: K8s Helm · Prometheus · Docker Compose · CI/CD.

---

## Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Exchange Trading** | Binance · Bybit · Futu · IBKR · Uniswap V3 · PancakeSwap · Raydium | ✅ Completed |
| **AI Scoring Engine** | 5-model collaboration (OpenAI/DeepSeek/Grok/Gemini/Ollama) · Composite score 0-100 → auto-trigger trades | ✅ Completed |
| **Risk Management** | VaR 95%/99% · CVaR · Kelly (Full/Half) · Fixed Fractional · Fixed Ratio · ATR · Risk Rule Engine | ✅ Completed |
| **Paper Trading Mode** | Full simulation engine with virtual balance (persisted), slippage, fees, partial fills, real-time PnL via WebSocket | ✅ Completed (Phase 4) |
| **Backtest System** | MA Cross + Score Threshold strategies · Sharpe/Sortino/Calmar · TradingView integration · Monthly returns | ✅ Completed |
| **Data Sources** | Telegram · X.com real-time monitoring · Auto-scoring + signal trigger → Trade Queue · Live price feed | ✅ Completed |
| **Real-time Push** | WebSocket (Socket.io JWT) · 5 event types: price/signal/order/risk/position · Auto-reconnect | ✅ Completed |
| **Monitoring & Alerts** | Prometheus（HTTP + Business metrics）+ Grafana · Structured Logging · Sentry Error Tracking · p95 latency · Kill Switch monitoring | ✅ Completed |
| **Security & Encryption** | AES-256-GCM API Key encryption · JWT Wallet auth · Redis Token Invalidation · 5-Role RBAC · Rate Limiting (all routes) · Ownership verification (data layer) · Helmet + Graceful Shutdown | ✅ Completed |
| **Scoring Rules** | Configurable weight editor (truth/sentiment/relevance/confidence) · Version history · Enable/Disable toggle · PostgreSQL persisted | ✅ Completed |
| **Notification Center** | In-app notification center · Read/Unread · Filter by type · System seeder · PostgreSQL persisted | ✅ Completed |
| **Container Deployment** | Docker Compose (6 services) · K8s Helm (2 charts) · HPA auto-scaling · Nginx · TLS · Graceful Shutdown | ✅ Completed |
| **Team Collaboration** | 5 roles · Permission validation (whitelist) · Audit logs · CSV export · Audit trail | ✅ Completed |
| **Complete Documentation** | Bilingual (EN/ZH) · API docs · Architecture docs · User guide · Test wallets · Permission matrix | ✅ Completed |

---

## 🆕 標準清單 (Standards List) — Restored & Updated

This section restores and updates the **core development and operational standards** for AQTMS. All contributions and implementations **must strictly follow** these standards. The list has been restored from previous versions and enhanced with clearer categorization and bilingual support.

### 1. Architecture Standards (架構標準)
- **Hexagonal + DDD + Clean Architecture**: Mandatory. Strict separation between Domain, Application, Infrastructure, and Interface layers.
- **Dependency Inversion Principle**: High-level modules depend on abstractions, not concretions.
- **Type Safety**: 100% TypeScript. **Zero `any` types**. Use `strict: true` in tsconfig.json. Prefer `unknown` + type guards over `any`.
- **Domain-Centric Design**: Business logic lives in Domain layer. Infrastructure implements ports/interfaces.

### 2. Security Standards (安全標準)
- **Encryption**: AES-256-GCM for all sensitive data (API keys, secrets, PII).
- **Authentication**: JWT Wallet Authentication + Redis-based token invalidation/refresh.
- **Authorization**: 5-Role RBAC with explicit permission whitelisting. Ownership verification enforced at data layer.
- **API Protection**: Rate limiting on **all** routes. Helmet.js for secure HTTP headers.
- **Graceful Shutdown**: Proper signal handling (SIGTERM/SIGINT) to close connections cleanly.
- **Input Validation**: Strict DTO validation (class-validator) on all inputs. No trust in client data.

### 3. Observability & Monitoring Standards (可觀測性標準)
- **Metrics**: Prometheus for both HTTP-level and business-level metrics (trades, PnL, risk checks, etc.).
- **Dashboards**: Grafana with clear panels for latency, error rates, trading volume, risk exposure.
- **Logging**: Structured JSON logging only. No plain text logs in production.
- **Error Tracking**: Sentry integrated for error reporting, stack traces, and performance monitoring (focus on p95/p99 latency).
- **Kill Switch**: Global emergency kill switch that can instantly halt all trading activities across the system.
- **Alerting**: Proactive alerts on anomaly detection (e.g., unusual drawdown, API errors, latency spikes).

### 4. Deployment & Infrastructure Standards (部署標準)
- **Local Development**: Docker Compose with exactly 6 services (app, db, redis, etc.).
- **Production**: Kubernetes + Helm charts (minimum 2 charts: backend, infrastructure).
- **Auto-scaling**: Horizontal Pod Autoscaler (HPA) enabled based on CPU/memory + custom metrics.
- **Reverse Proxy**: Nginx with TLS termination. No direct exposure of app ports.
- **Process Management**: PM2 (or equivalent) for Node.js process management, clustering, and zero-downtime reloads.
- **Secrets Management**: Kubernetes Secrets + external secret store (e.g., Vault or cloud KMS). Never commit secrets.

### 5. Code Quality & Development Standards (代碼質量標準)
- **Formatting & Linting**: ESLint + Prettier + EditorConfig. Husky + lint-staged for pre-commit hooks.
- **Commit Convention**: Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`, `docs:`).
- **Testing**: 
  - Unit tests (Jest)
  - Integration tests (Supertest + test DB)
  - E2E tests (Playwright or similar)
  - Minimum 80% coverage on critical paths (risk engine, execution, auth)
- **API Documentation**: OpenAPI/Swagger auto-generated. All endpoints documented.
- **Error Handling**: Centralized exception filter. Never leak internal errors to clients.

### 6. Data & Persistence Standards (數據標準)
- **ORM**: Prisma with PostgreSQL. All schema changes via migrations (never manual SQL in production).
- **Caching**: Redis for hot data, sessions, and token management. Proper TTL and invalidation strategy.
- **Transactions**: Use database transactions for any multi-step write operations (especially trading + risk + position updates).
- **Data Encryption at Rest**: Sensitive fields encrypted before storing in DB.
- **Audit**: All critical actions (trade execution, risk override, user permission changes) must be audit-logged.

### 7. Trading & Risk Engine Standards (交易與風控標準)
- **Risk-First Principle**: **Every** trade/order **must** pass through the Risk Engine before execution. No bypass allowed.
- **Paper Trading Fidelity**: Must faithfully simulate real trading conditions:
  - Virtual balance persistence (DB)
  - Realistic slippage model
  - Fee simulation (maker/taker)
  - Partial fills support
  - Real-time unrealized PnL calculation
- **Configurable Risk Rules**: All risk parameters (VaR, position limits, daily loss limits, etc.) must be configurable via UI/API without code changes.
- **Kill Switch Integration**: Risk engine must respect global Kill Switch state.

### 8. Documentation & Collaboration Standards (文檔與協作標準)
- **Bilingual Documentation**: All major docs must exist in both English and **Traditional Chinese (繁體中文)**. Keep both in sync.
- **API Docs**: Always up-to-date Swagger UI + exported Postman collection.
- **Architecture Decision Records (ADRs)**: Major architectural decisions must be recorded.
- **Test Wallets & Fixtures**: Documented test accounts, mock data, and seed scripts for reproducible testing.
- **Permission Matrix**: Clear matrix of roles vs permissions maintained in docs.
- **Onboarding Guide**: Clear developer onboarding guide (setup, run tests, deploy locally).

### 9. General Principles
- **Security & Risk > Features**: Never compromise security or risk controls for faster feature delivery.
- **Testability**: Every module must be easily unit-testable. Avoid tight coupling.
- **Observability by Default**: Logging, metrics, and tracing must be built-in from the start, not added later.
- **Fail Fast & Graceful Degradation**: System must fail fast on critical errors and degrade gracefully (e.g., disable auto-trading but keep monitoring).

---

## Getting Started

(Keep existing getting started section or refer to original)

---

## License

MIT License

---

*This README has been restored and updated with a comprehensive, categorized **標準清單 (Standards List)** to ensure all future development strictly adheres to the project's architectural, security, and quality standards. The Chinese version (README.zh.md) has also been synchronized with equivalent content.*