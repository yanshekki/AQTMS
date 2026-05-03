# Changelog

## [1.0.0] — 2026-05-03

### 🚀 Initial Release — 全自動化量化交易管理系統

#### Core Features
- **Multi-Exchange Trading**: Binance, Bybit, Futu, IBKR, Uniswap V3, PancakeSwap, Raydium
- **AI Scoring Pipeline**: 5-model collaboration (OpenAI, DeepSeek, Grok, Gemini, Ollama) → composite score 0-100
- **Risk Engine**: VaR 95%/99%, CVaR, Max Drawdown, Concentration Risk, Beta Exposure, Correlation Matrix
- **Position Sizing**: Kelly Criterion (Full/Half), Fixed Fractional, Fixed Ratio, ATR-Adjusted — all 4 compared
- **Backtest Engine**: MA Cross strategy, Sharpe/Sortino/Calmar ratios, equity/drawdown curves, monthly returns
- **Data Sources**: Telegram + X.com polling → AI scoring → trade signal auto-trigger
- **Real-time Push**: WebSocket (Socket.io) — price updates, AI signals, order state, risk alerts
- **Monitoring**: Prometheus metrics (12 types), Grafana dashboards, queue health
- **Security**: AES-256-GCM API key encryption, JWT wallet auth, RBAC route-level permissions
- **Container Deployment**: Docker Compose (6 services), Kubernetes Helm (2 charts), HPA auto-scaling

#### Frontend (14 pages)
- Dashboard, Exchanges, AI Signals, Backtest
- Risk, Portfolio, Trade History, Notifications
- Settings (4 tabs: Profile, API Keys, Notifications, Security)
- Scoring Rules, User Management, Audit Log, System Settings
- Login (Wallet-based: MetaMask, Brave, WalletConnect, Coinbase)
- Full RBAC: 5 roles (VIEWER, TRADER, ANALYST, ADMIN, SUPER_ADMIN)
- Theme-aware (light/dark), responsive (mobile-first), MUI + Recharts

#### Backend Architecture
- Hexagonal Architecture + DDD + Clean Architecture
- 66 TypeScript files, 0 cross-layer dependency violations
- 0 `any` types in production code
- 22 API routes with comprehensive permission matrix
- 3 Bee-Queue workers: news (5), AI (10), trade (3)

#### Security
- All API inputs/outputs Zod-validated
- Rate limiting (general 100/min, auth 10/min, trade 30/min)
- Helmet security headers, CORS configuration
- Express 5 error handling middleware
- Global auth middleware + route-level permission checks

#### Testing
- 9 unit tests (AES-256-GCM encryption)
- 21 E2E tests (Playwright): auth flow, exchange connect, risk engine, backtest, audit, permission enforcement
- Test coverage: auth, trading, risk, backtest, monitoring, data isolation

#### Documentation
- README.md: project overview, quick start, architecture, tech stack
- docs/architecture.md: Hexagonal + DDD + Clean Architecture design
- docs/api.md: complete API reference with request/response examples
- docs/user-guide.md: user guide + demo video script (5-8 min)
- docs/deployment.md: Docker Compose + Kubernetes Helm deployment
- docs/live-trading-test.md: 7-phase live trading test checklist
- docs/test-checklist.md: acceptance test criteria

#### DevOps
- Docker Compose: backend (×2), frontend, MySQL 8.4, Redis 7, Prometheus, Grafana
- Kubernetes Helm: backend (HPA), frontend (TLS), cert-manager
- CI/CD: GitHub Actions (lint → test → build → docker → deploy)

### Fixes (34 bugs resolved during audit)
- AdapterMap key resolution (account UUID → exchange type → adapter)
- News → Trade pipeline connection (score ≥ 80 → auto enqueue)
- CorrelationMatrix DTO alignment (array → string format)
- Trade list data isolation (userId filter)
- Exchange delete ownership verification
- Calmar ratio unit normalization
- Decision AI phase fallback provider
- 4 public API routes with missing auth (AI providers, news, audit export)
- Backtest permission elevation (trade:read → dedicated backtest:run)
- 0 `any` types achieved across entire codebase
- Zero cross-layer architecture violations verified
