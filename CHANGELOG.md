# Changelog

## [1.1.0] — 2026-05-04

### 🔒 Security Audit — 4 Rounds (70/70 Tests Passed)

#### Round 1: Permission RBAC Fixes
- Added `USER_READ` permission to VIEWER, TRADER, ANALYST roles (was missing)
- Added `SCORING_MANAGE` permission to ADMIN role (was missing)
- Added route guard on `/notifications` (requires `USER_READ`)
- Dashboard: Risk alert WS gated behind `risk:view`, "View Only" for VIEWERs
- Settings: API Keys tab hidden without `exchange:connect`
- Synced backend `ROLE_PERMISSIONS` with frontend

#### Round 2: Security Hardening (Critical)
- **Backtest GET routes**: Added userId scoping (was leaking all users' data)
- **Portfolio routes**: Added userId scoping to all 4 endpoints
- **ExchangeRepository**: Added ownership checks to `getDecryptedCredentials`, `updateStatus`, `delete`
- **ExchangeController**: Added ownership checks to `testConnection`, `getBalances`, `getPositions`
- **Trade route**: Added userId filter to `GET /:id` (was: any user could see any trade)
- **Trade use case**: Added userId param through entire execution chain (`TradeController` → `ExecuteTradeUseCase` → `adapterMap`)
- **Notifications**: Migrated from in-memory to PostgreSQL with user scoping + system seeder
- **Scoring Rules**: Migrated from in-memory Map to PostgreSQL with user scoping
- **Auth middleware**: Added Redis-based JWT token invalidation check
- **Auth routes**: Added `POST /auth/invalidate` endpoint, permission whitelist validation on login
- **Health endpoint**: Removed sensitive info (memory, queues, Redis, AI providers)
- **Metrics endpoint**: Added `METRICS_SECRET` authentication
- **Rate limiting**: Added to ALL API routes (was missing on 6 route groups)
- **WebSocket CORS**: Changed from `*` to configured `CORS_ORIGIN`
- **News processor**: Replaced hardcoded `currentPrice: 50000` with live Binance API price feed (15s cache)

#### Round 3: Functional Audit
- **WebSocket**: Rewrote from native WebSocket to socket.io-client — fixed auth handshake, room joining
- **Scoring Rules toggle**: Fixed `handleToggle` from mock `simulateSave` to real `scoringRulesApi.toggleRule()`
- **Scoring rules schema**: Added `enabled` field, renamed `versions`→`history`, `by`→`changedBy` — aligned with backend
- **Notifications schema**: Mapped `createdAt`→`time` for frontend compatibility
- **i18n**: Added missing `dashboard.viewOnly` (en/zh) and `auth.required` keys

#### Round 4: Build & Verification
- Fixed `permissions` column type: `VARCHAR(191)` → `VARCHAR(2000)` for longer JSON arrays
- Fixed Express 4.x async middleware bug: changed `async authMiddleware` to synchronous with fire-and-forget Redis check
- **70/70 automated permission tests passed** across 5 roles × 14 endpoints
- **Vite production build verified** (1.6MB JS + 9KB CSS)
- **0 TypeScript errors** (strict mode, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)

### 📊 New Features
- **Token Invalidation**: Admin can revoke all tokens for a user via `POST /auth/invalidate`
- **Permission Whitelist**: Login validates permissions against known list — prevents DB privilege escalation
- **Live Price Feed**: News processor fetches current price from Binance public API (15s TTL cache)
- **System Notifications**: Auto-seeded welcome notifications for new users
- **Test Infrastructure**: `test-full.cjs` (full audit), `test-av.cjs` (per-role), `TEST_WALLETS.md` (test wallets + steps)

### 📝 Documentation
- **README.md** (EN): Added permission matrix, security architecture diagram, full API table (33 endpoints), audit badge
- **README.zh.md** (CN): Full Chinese translation with all updates
- **TEST_WALLETS.md**: 5 test wallets with private keys, permission matrix, test steps, DB seed script
- **CHANGELOG.md**: This file — complete changelog

### 🗄️ Database Changes
```sql
-- New tables
ScoringRule (id, userId, name, weights, threshold, action, enabled, versions)
Notification (id, userId, type, title, message, read, targetRoute)

-- Schema fixes
User.permissions: VARCHAR(191) → VARCHAR(2000)
```

---

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
