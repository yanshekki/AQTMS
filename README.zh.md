[English](README.md) | [繁體中文](README.zh.md)

# 🏦 AQTMS — 全自動化量化交易管理系統

**Automated Quantitative Trading Management System**

企業級全自動量化交易平台 — 整合多交易所（CEX + DEX）、多 AI 模型、多資訊來源、專業風險控制，實現智能無人值守交易。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://prisma.io)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-326CE5?logo=kubernetes)](https://kubernetes.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-✅-E6522C?logo=prometheus)](https://prometheus.io)
[![Security Audit](https://img.shields.io/badge/Security-70/70_測試通過-22c55e)](TEST_WALLETS.md)
[![Progress](https://img.shields.io/badge/Progress-35%25-blue)](README.zh.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 項目簡介

AQTMS 從**新聞抓取 → AI 真假判斷 + 多維評分 → 策略觸發 → 統一交易執行**，全流程自動化。

**核心價值：**
- 🚀 全自動化：不需要人手盯盤，AI 自動判斷 + 執行
- 🧠 多 AI 協作：Grok 驗真 + Gemini 評分 + DeepSeek 決策 + 自動降級
- 🏦 全資產：加密貨幣 + 港股美股 + DEX 統一交易
- 🛡 專業風控：VaR/CVaR · Kelly · 動態倉位 · 強制平倉規則
- 📊 完整回測：歷史數據回放 + Sharpe/Sortino/Calmar 報告
- 🔬 企業級架構：Hexagonal + DDD + Clean Architecture · 零 any 類型
- 🔒 安全至上：AES-256-GCM · JWT Wallet 認證 · Token 撤銷 · 5 角色 RBAC · 全線速率限制 · 所有權驗證
- ☸️ 生產就緒：K8s Helm · Prometheus · Docker Compose · CI/CD

---

## 🎯 核心功能

| 功能 | 說明 | 狀態 |
|------|------|------|
| **多交易所交易** | Binance · Bybit · Futu · IBKR · Uniswap V3 · PancakeSwap · Raydium | ✅ |
| **AI 評分引擎** | 5 模型協作（OpenAI/DeepSeek/Grok/Gemini/Ollama）· 綜合評分 0-100 → 自動觸發交易 | ✅ |
| **風險管理** | VaR 95%/99% · CVaR · Kelly (Full/Half) · Fixed Fractional · Fixed Ratio · ATR · 風險規則引擎 | ✅ |
| **回測系統** | MA Cross + Score Threshold 策略 · Sharpe/Sortino/Calmar · TradingView 整合 · 月回報 | ✅ |
| **資訊來源** | Telegram · X.com 即時監控 · 自動評分 + 信號觸發 → Trade Queue · 實時價格 | ✅ |
| **實時推送** | WebSocket（Socket.io JWT）· price/signal/order/risk/position 5 事件類型 · 自動重連 | ✅ |
| **監控告警** | Prometheus（HTTP + Business metrics）+ Grafana · Structured Logging · Sentry Error Tracking · p95 延遲 · Kill Switch 監控 | ✅ |
| **安全加密** | AES-256-GCM API Key 加密 · JWT Wallet 認證 · Redis Token 撤銷 · 5 角色 RBAC · 全線速率限制 · 所有權驗證（數據層） | ✅ |
| **評分規則** | 可配置權重編輯器（真實度/情緒/相關度/可信度）· 版本歷史 · 啟用/停用開關 · PostgreSQL 持久化 | ✅ |
| **通知中心** | 應用內通知中心 · 已讀/未讀 · 按類型篩選 · 系統種子 · PostgreSQL 持久化 | ✅ |
| **容器部署** | Docker Compose（6 services）· K8s Helm（2 charts）· HPA 自動擴容 · Nginx · TLS · **Graceful Shutdown** | ✅ |
| **團隊協作** | 5 角色 · 權限白名單驗證 · 審計日誌 · CSV 導出 · 審計追蹤 | ✅ |
| **完整文檔** | 雙語（中/英）· API 文件 · 架構文件 · 用戶指南 · 測試錢包 · 權限矩軸 | ✅ |

---

## 🔐 權限系統

AQTMS 實行完善的**基於角色的訪問控制（RBAC）**系統，設有 5 個角色及 16 個精細權限。

| 角色 | 權限數 | 可訪問 |
|------|--------|--------|
| 👑 **SUPER_ADMIN** | 16 個全權限 | 所有頁面 + 系統配置 |
| 🔧 **ADMIN** | 15 個（冇 `risk:manage`） | 所有頁面 + 用戶/審計管理 |
| 💹 **TRADER** | 8 個 | 儀表板、交易所、交易記錄、投資組合、風險、通知、設定 |
| 📊 **ANALYST** | 10 個 | + AI 訊號、回測、評分規則 |
| 👀 **VIEWER** | 3 個（`trade:read`, `exchange:read`, `user:read`） | 儀表板、交易記錄、投資組合、通知、設定 |

### 權限矩軸

| 權限 | SUPER | ADMIN | TRADER | ANALYST | VIEWER |
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

> 🔒 **安全驗證**：70/70 自動化權限測試全部通過（5 角色 × 14 endpoint）。
> 詳見 [TEST_WALLETS.md](TEST_WALLETS.md) 測試錢包及驗證步驟。

### 安全架構

```
Request
  ↓ Rate Limiting（所有路由）
  ↓ CORS（已配置）
  ↓ Helmet（安全標頭）
  ↓ Structured Logging + Sentry
  ↓ Prometheus Metrics（HTTP + Business）
  ↓ JWT 認證 + Token 撤銷（Redis）
  ↓ Permission Middleware（RBAC）
  ↓ 權限白名單驗證
  ↓ Controller 所有權檢查
  ↓ Repository 所有權檢查
  ↓ Zod Response Validation（前端）
  ↓ User-Scoped Data Queries
```

---

## 🚀 快速開始

### 環境要求

| 依賴 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥ 22 | Runtime |
| pnpm | ≥ 10 | Package manager |
| MySQL | ≥ 8 | 主數據庫 |
| Redis | ≥ 7 | 快取、隊列、Session |

### 安裝

```bash
# 1. Clone
git clone git@github.com:yanshekki/AQTMS.git aqtms && cd aqtms

# 2. 安裝依賴
pnpm install

# 3. 設定環境變數
cp apps/backend/.env.example apps/backend/.env
# 編輯 .env — 填入 DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY

# 4. 初始化數據庫
cd apps/backend && npx prisma db push && cd ../..

# 5. 啟動（開發模式）
# Backend: http://localhost:3001
cd apps/backend && pnpm dev

# Frontend: http://localhost:5173
cd apps/web && pnpm dev
```

### 使用 Docker Compose（完整生產環境）

```bash
# 啟動全部服務（Backend + Frontend + MySQL + Redis + Prometheus + Grafana）
docker-compose up -d

# 訪問
# Frontend:  http://localhost
# Backend:   http://localhost:3001
# Grafana:   http://localhost:3000 (admin/admin)
# Metrics:   http://localhost:3001/metrics
```

---

## 🏗 架構

### Backend — Hexagonal Architecture + DDD + Clean Architecture

```
apps/backend/src/
├── domain/           # 純領域層（entities, value-objects, repository interfaces）
├── application/      # 用例層（ExecuteTradeUseCase, ProcessNewsUseCase）
├── infrastructure/   # 技術實現（Prisma, Adapters, BeeQueue, AI Providers）
├── interfaces/       # HTTP/WS 邊界（controllers, dto, middleware, routes）
├── shared/           # 跨層共用（errors, logger, config, redis, websocket, metrics, i18n）
└── main.ts           # 入口
```

### Frontend — Feature-Sliced Design + Atomic

```
apps/web/src/
├── app/              # Providers, Router, ErrorBoundary, ProtectedRoute
├── features/         # 業務功能（exchange-connect, ai-signals）
├── pages/            # 頁面（Dashboard, Exchanges, AISignals, Backtest 等）
├── components/       # 共用組件（layout/Header, ui/）
├── shared/           # api/, lib/, hooks/
└── store/            # Jotai state
```

### 微服務演進路徑

```
當前：模組化單體
  ↓ Phase 3
提取 Data Ingestion + AI Orchestration 為獨立微服務 + NATS
  ↓ Phase 4
全量微服務 + K8s + Istio + OpenTelemetry + Saga
```

---

## 📡 API 總覽

> 完整 API 文件：參閱 [docs/api.md](docs/api.md)

> **注意**：所有敏感 endpoint（例如 `/api/v1/trades` 下單）受 **Rate Limiting** 保護（10秒內最多 5 個請求）。

| Method | Endpoint | 權限 | 說明 |
|--------|----------|------|------|
| GET | `/health` | Public | 健康檢查 |
| GET | `/metrics` | METRICS_SECRET | Prometheus metrics |
| POST | `/auth/challenge` | 限速 | Wallet 登入挑戰 |
| POST | `/auth/authenticate` | 限速 | 簽名驗證 → JWT |
| GET | `/auth/me` | 已認證 | 當前用戶資訊 |
| POST | `/auth/invalidate` | `admin:user:manage` | 撤銷用戶所有 Token |
| GET | `/api/v1/trades` | `trade:read` | 交易列表（用戶隔離） |
| GET | `/api/v1/trades/:id` | `trade:read` | 交易詳情（用戶隔離） |
| POST | `/api/v1/trades` | `trade:execute` | 下單（受 Rate Limiting 保護） |
| DELETE | `/api/v1/trades` | `trade:cancel` | 撤單 |
| POST | `/api/v1/exchanges/connect` | `exchange:connect` | 連接交易所（AES-256 加密） |
| GET | `/api/v1/exchanges` | `exchange:read` | 交易所列表（用戶隔離） |
| GET | `/api/v1/exchanges/:id/balance` | `exchange:read` | 交易所餘額（已驗證所有權） |
| GET | `/api/v1/exchanges/:id/positions` | `exchange:read` | 持倉（已驗證所有權） |
| POST | `/api/v1/exchanges/:id/test` | `exchange:connect` | 測試連接（已驗證所有權） |
| DELETE | `/api/v1/exchanges/:id` | `exchange:connect` | 刪除交易所（已驗證所有權） |
| GET | `/api/v1/portfolio/summary` | `trade:read` | 組合摘要（用戶隔離） |
| GET | `/api/v1/portfolio/allocation` | `trade:read` | 資產配置（用戶隔離） |
| GET | `/api/v1/portfolio/performance` | `trade:read` | 表現歷史（用戶隔離） |
| GET | `/api/v1/portfolio/holdings` | `trade:read` | 持倉詳情（用戶隔離） |
| POST | `/api/v1/risk/metrics` | `risk:view` | 計算風險指標 |
| POST | `/api/v1/risk/position-size` | `trade:execute` | 倉位計算（4 算法） |
| POST | `/api/v1/risk/evaluate` | `risk:view` | 交易前風險檢查 |
| POST | `/api/v1/backtest/run` | `backtest:run` | 執行回測 |
| GET | `/api/v1/backtest/history` | `backtest:run` | 回測歷史（用戶隔離） |
| GET | `/api/v1/backtest/:id` | `backtest:run` | 回測詳情（用戶隔離） |
| GET | `/api/v1/scoring-rules` | `scoring:manage` | 評分規則列表（用戶隔離） |
| POST | `/api/v1/scoring-rules` | `scoring:manage` | 建立規則 |
| PUT | `/api/v1/scoring-rules/:id` | `scoring:manage` | 更新規則（含版本歷史） |
| DELETE | `/api/v1/scoring-rules/:id` | `scoring:manage` | 刪除規則（用戶隔離） |
| GET | `/api/v1/notifications` | `user:read` | 通知列表（用戶隔離） |
| PUT | `/api/v1/notifications/:id/read` | `user:read` | 標為已讀 |
| PUT | `/api/v1/notifications/read-all` | `user:read` | 全部標為已讀 |
| GET | `/api/v1/ai/providers` | `ai:read` | AI Provider 狀態 |
| GET | `/api/v1/news/recent` | `ai:read` | 最新 AI 評分新聞 |
| GET | `/api/v1/news/:id` | `ai:read` | 新聞詳情 |
| GET | `/api/v1/audit/export` | `audit:export` | 審計日誌 CSV 下載 |

> **33 個 API endpoint** — 全部配備 permission middleware、速率限制、及用戶隔離（如適用）。

---

## 🛠 技術棧

### Backend
| 類別 | 技術 |
|------|------|
| Runtime | Node.js 22 + TypeScript 5.4 (strict) |
| Framework | Express 5 |
| Database | Prisma 5 + MySQL 8 |
| Cache | Redis 7 (ioredis) |
| Queue | Bee-Queue (3 queues) |
| Auth | JWT + EIP-191 Wallet Signature |
| Validation | Zod (all inputs/outputs) |
| AI | OpenAI · DeepSeek · Grok · Gemini · Ollama |
| **Logging** | Structured JSON Logger + Sentry | ← Phase 3 新增 |
| **Monitoring** | Prometheus + Prom-client (HTTP + Business metrics) | ← Phase 3 新增 |
| **Error Tracking** | Sentry (Error + Performance) | ← Phase 3 新增 |
| WebSocket | Socket.io (JWT auth + 5 event types) |
| Security | Helmet · AES-256-GCM · Rate Limiting（全線）· RBAC（5 角色 × 16 權限）· Token 撤銷 | 
| i18n | Accept-Language 頭部辨識（English / 繁體中文） |

### Frontend
| 類別 | 技術 |
|------|------|
| Framework | React 18 + TypeScript 5.4 (strict) |
| Build | Vite 6 |
| UI | MUI 5 + Emotion |
| State | @tanstack/react-query + Jotai |
| Charts | Recharts + TradingView Lightweight Charts |
| Form | React Hook Form + Zod |
| Auth | Wagmi + WalletConnect + MetaMask |
| WebSocket | Socket.io-client（JWT auth handshake） |
| i18n | react-i18next（English / 繁體中文） |
| Testing | Vitest + React Testing Library + MSW |

### DevOps
| 類別 | 技術 |
|------|------|
| CI/CD | GitHub Actions (lint → test → build → docker) |
| Container | Docker + Docker Compose (6 services) |
| Orchestration | Kubernetes + Helm (2 charts) |
| Monitoring | Prometheus + Grafana |
| E2E Testing | Playwright (12 test cases) |

---

## 🐳 部署

### Graceful Shutdown（Phase 3 新增）

AQTMS 支援 **Graceful Shutdown**，適合 Docker / Kubernetes 環境：
- 收到 `SIGTERM` / `SIGINT` 時會優雅關閉
- WebSocket 連線會自動清理
- 確保進行中嘅交易請求完成後先退出

### PM2 Process Manager (Recommended)

```bash
# 全局安裝 PM2
npm install -g pm2

# 啟動所有服務（開發模式）
pnpm pm2:start

# 啟動生產模式（會先 build frontend）
pm2:start:prod

# 監控面板
npm2:monit

# 查看日誌
npm2:logs

# 狀態總覽
npm2:status

# 平滑重啟（零停機）
pm2:reload

# 停止全部
npm2:stop

# 保存進程列表（開機自啟）
pm2:save
npm2:startup
```

#### PM2 Process List

| Process | Port | Mode | Memory Limit |
|---------|------|------|-------------|
| `aqtms-backend` | 3001 | fork | 512M |
| `aqtms-frontend-dev` | 5173 | fork | 256M |
| `aqtms-frontend` | 5173 | fork | 128M |

> 📁 完整配置：`ecosystem.config.cjs`

### Docker Compose（開發/小型生產）

```bash
docker-compose up -d
```

- Backend ×2 replicas
- Frontend ×1 (Nginx + SPA)
- MySQL 8.4 + Redis 7
- Prometheus + Grafana

### Kubernetes（生產）

```bash
# Backend (with HPA auto-scaling)
helm install aqtms-backend ./infra/helm/backend -f values-prod.yaml

# Frontend (with TLS)
helm install aqtms-frontend ./infra/helm/frontend -f values-prod.yaml
```

> 完整部署指南：參閱 [docs/deployment.md](docs/deployment.md)

---

## 🧪 測試

### Phase 3 Integration Tests（新增）
- ExecutionService + ExchangeService 整合測試
- WebSocket executionReport 處理流程測試
- Risk Rules 單元測試
- KillSwitchService 關鍵路徑測試

### 權限審計測試

```bash
cd apps/backend && node test-full.cjs
# 70/70 權限測試（5 角色 × 14 endpoint）✅
```

### E2E Tests (Playwright)

```bash
cd e2e && npx playwright test
```

### Backend Unit Tests

```bash
cd apps/backend && pnpm test
```

### 測試覆蓋

- 🔐 認證流程（登入、重定向）
- 🔑 權限執行（5 角色 × 14 endpoint）
- 💱 交易所連接（表單、模態框、測試、所有權）
- 📊 風險引擎（指標、倉位、評估）
- 📈 回測引擎（執行、歷史、詳情、用戶隔離）
- 📋 評分規則（CRUD、版本歷史、開關、用戶隔離）
- 🔔 通知（列表、標為已讀、用戶隔離）
- 🩺 API 健康檢查 + Prometheus metrics
- 📋 審計 CSV 導出
- 🛡 數據隔離（用戶隔離查詢、所有權檢查）

---

## 📊 數據庫 Schema

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

> 🔒 `apiKey`/`apiSecret` 使用 AES-256-GCM 加密儲存
> 🔒 所有查詢均以用戶隔離，數據層有所有權驗證

---

## 📂 項目結構

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
├── TEST_WALLETS.md       # 測試錢包地址 + 權限矩軸
├── README.md             # English
└── README.zh.md          # 繁體中文
```

---

## 🤝 貢獻

歡迎貢獻！不論係 Bug Report、Feature Request 定係 PR。

### 點樣貢獻

1. **Fork** 本倉庫
2. **建立 Branch**：`git checkout -b feat/amazing-feature`
3. **Commit**：`git commit -m 'feat: add amazing feature'`
4. **Push**：`git push origin feat/amazing-feature`
5. **開 Pull Request** → 填寫 PR Template

### Issue Templates

| Template | 用途 |
|----------|------|
| 🐛 [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) | 報告錯誤 |
| ✨ [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) | 建議新功能 |
| ❓ [Question](.github/ISSUE_TEMPLATE/question.md) | 一般問題 |

### Commit 規範

使用 [Conventional Commits](https://www.conventionalcommits.org/)：
- `feat:` 新功能
- `fix:` 錯誤修復
- `docs:` 文檔更新
- `perf:` 性能優化
- `test:` 測試相關
- `chore:` 構建/依賴

### PR Checklist

提交 PR 前請確認：
- [ ] 代碼符合項目風格
- [ ] 無 `any` 類型
- [ ] 權限在 Route / Middleware 處理
- [ ] API I/O 有 Zod 驗證
- [ ] 錯誤使用 AppError
- [ ] 數據查詢有用戶隔離（如適用）
- [ ] 數據層有所有權驗證（如適用）
- [ ] 無跨層架構違反

---

## 👤 作者

**Ki (yanshekki)** — 全棧開發者、量化交易員，[YSK Limited](https://ysk.hk/) 創辦人。

🌐 [linktr.ee/yanshekki](https://linktr.ee/yanshekki) · 🏢 [ysk.hk](https://ysk.hk/)

### ☕ 支持 / 捐贈

如果 AQTMS 幫到你，請我飲杯咖啡！

| Network | Address |
|---------|---------|
| **EVM** (ETH/BSC/Polygon) | `yanshekki.eth` |
| **NEAR** | `yanshekki.near` |
| **ADA** (Cardano) | `$yanshekki` |

<p align="center">
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://linktr.ee/yanshekki" alt="yanshekki QR" width="200" />
  <br/>
  <sub>掃碼支持 → linktr.ee/yanshekki</sub>
</p>

---

## 📄 授權

MIT © AQTMS

---

## ✅ 驗收標準

| 對象 | 時間 | 目標 | 達成方式 |
|------|------|------|----------|
| **開發者** | 30 分鐘 | 成功啟動項目 | `pnpm install` → `cp .env.example .env` → `prisma db push` → `pnpm dev` |
| **投資人** | 5 分鐘 | 理解項目價值 | 閱讀 README 項目簡介 + 核心功能表 |
| **用戶** | 10 分鐘 | 完成首次交易 | Login → Exchange Connect → 查看 AI Signals → Backtest |
| **審計者** | 5 分鐘 | 驗證安全性 | `node test-full.cjs` → 70/70 通過 + 查看權限矩軸 |

---

---

**AQTMS — 讓 AI 為你交易。** 🤖📈

<sub>Powered by [YSK Limited](https://ysk.hk/) — 香港遠程開發團隊及企業解決策</sub>
