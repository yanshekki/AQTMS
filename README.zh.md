# 🏦 AQTMS — 全自動化量化交易管理系統

企業級全自動量化交易平台 —— 整合多交易所（CEX + DEX）、多 AI 模型、多資訊來源，以及專業風險控制，實現智能化無人值守交易。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://prisma.io)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-326CE5?logo=kubernetes)](https://kubernetes.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-✅-E6522C?logo=prometheus)](https://prometheus.io/)
[![Security Audit](https://img.shields.io/badge/Security-70/70_tests_passed-22c55e)](TEST_WALLETS.md)
[![Progress](https://img.shields.io/badge/Progress-85%25-brightgreen)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | **繁體中文**

---

## 📖 項目概覽

AQTMS 自動化完整流程：**資訊擷取 → AI 驗證 + 多維度評分 → 策略觸發 → 統一交易執行**。

**核心價值：**
- 🚀 **全自動化**：無需人工盯盤，AI 自動判斷並執行交易
- 🧠 **多 AI 協作**：Grok 驗真 + Gemini 評分 + DeepSeek 決策 + 自動降級備援
- 🏦 **全資產支援**：加密貨幣 + 港股美股 + DEX 統一交易
- 🛡️ **專業風控**：VaR/CVaR · Kelly · 動態倉位管理 · 強制平倉規則
- 📊 **完整回測系統**：歷史數據回放 + Sharpe/Sortino/Calmar 報告 + 策略註冊表 + 可視化報告
- 🔬 **企業級架構**：Hexagonal + DDD + Clean Architecture · 零 `any` 類型
- 🔒 **安全至上**：AES-256-GCM · JWT Wallet 認證 · Token 撤銷 · 5 角色 RBAC · 全線速率限制 · 所有權驗證
- ☸️ **生產就緒**：K8s Helm · Prometheus · Docker Compose · CI/CD · 完整可觀測性堆疊

**最新更新（2026 年 5 月）：**
- Phase 5 回測引擎完成，包含策略介面、註冊表、MA Cross + Mean Reversion 範例、Binance/Bybit 歷史數據整合、先進指標（Sharpe、Max Drawdown、Profit Factor、Win Rate 等）
- 執行層強化：訂單生命週期 + 狀態機、部分成交處理、執行日誌記錄器、帶延遲追蹤的指標收集器
- 模擬交易模式：完整持久化（資料庫中的虛擬餘額）、滑點模擬、手續費模型、部分成交、透過 MarketDataService + WebSocket 的實時未實現盈虧
- 安全與可觀測性：Kill Switch 整合、對帳服務、結構化日誌、Prometheus 指標、Sentry、優雅關閉
- 示範可視化報告生成（權益曲線、回撤、價格 + 信號 + 已執行交易）

---

## 🎯 核心功能

| 功能 | 說明 | 狀態 |
|------|------|------|
| **多交易所交易** | Binance · Bybit · Futu · IBKR · Uniswap V3 · PancakeSwap · Raydium | ✅ |
| **AI 評分引擎** | 5 模型協作（OpenAI/DeepSeek/Grok/Gemini/Ollama）· 綜合評分 0-100 → 自動觸發交易 | ✅ |
| **風險管理** | VaR 95%/99% · CVaR · Kelly (Full/Half) · Fixed Fractional · Fixed Ratio · ATR · 風險規則引擎 + 交易前評估 | ✅ |
| **模擬交易模式** | 完整模擬引擎（資料庫持久化虛擬餘額、滑點、手續費、部分成交、透過 MarketDataService + WebSocket 實時 PnL） | ✅（Phase 4） |
| **回測系統** | MA Cross + Mean Reversion + Score Threshold 策略 · 策略註冊表 + 介面 · Sharpe/Sortino/Calmar/Profit Factor/Win Rate/Max DD · Binance/Bybit 歷史數據 · 可視化報告（權益、回撤、交易） | ✅（Phase 5） |
| **資訊來源** | Telegram · X.com 即時監控 · 自動評分 + 信號觸發 → Trade Queue · 實時價格來源（WebSocket + REST 備援） | ✅ |
| **實時推送** | WebSocket（Socket.io JWT）· 5 種事件類型：price/signal/order/risk/position · 自動重連 + 指標 | ✅ |
| **監控與告警** | Prometheus（12+ 指標類型，包含執行延遲、部分成交、風險檢查）+ Grafana · p95 延遲 · 交易成功率 · 隊列健康 · Kill Switch 狀態 | ✅ |
| **安全與加密** | AES-256-GCM API Key 加密 · JWT Wallet 認證 · Redis Token 撤銷 · 5 角色 RBAC · 全線速率限制 · 資料層所有權驗證 · Helmet + 優雅關閉 | ✅ |
| **評分規則** | 可配置權重編輯器（真實度/情緒/相關度/可信度）· 版本歷史 · 啟用/停用開關 · PostgreSQL 持久化 | ✅ |
| **通知中心** | 應用內通知中心 · 已讀/未讀 · 按類型篩選 · 系統種子 · PostgreSQL 持久化 | ✅ |
| **容器部署** | Docker Compose（6 個服務）· K8s Helm（2 個 Chart）· HPA 自動擴容 · Nginx · TLS · PM2 叢集 | ✅ |
| **團隊協作** | 5 角色 · 權限白名單驗證 · 審計日誌 · CSV 導出 · 審計追蹤 | ✅ |
| **完整文件** | 雙語（EN/ZH）· API 文件（Swagger）· 架構文件 · 用戶指南 · 測試錢包 · 權限矩陣 · 標準清單 | ✅ |

---

## 🔐 權限系統

AQTMS 實作了完整的 **基於角色的存取控制 (RBAC)** 系統，包含 5 個角色與 16 個細粒度權限。

| 角色 | 權限數 | 存取範圍 |
|------|--------|----------|
| 👑 **SUPER_ADMIN** | 全部 16 項權限 | 所有頁面 + 系統設定 |
| 🔧 **ADMIN** | 15 項權限（無 `risk:manage`） | 所有頁面 + 使用者/審計管理 |
| 💹 **TRADER** | 8 項權限 | Dashboard、Exchanges、Trades、Portfolio、Risk、Notifications、Settings |
| 📊 **ANALYST** | 10 項權限 | + AI Signals、Backtest、Scoring Rules |
| 👀 **VIEWER** | 3 項權限（`trade:read`、`exchange:read`、`user:read`） | Dashboard、Trades、Portfolio、Notifications、Settings |

### 權限矩陣

| 權限 | SUPER | ADMIN | TRADER | ANALYST | VIEWER |
|------|-------|-------|--------|---------|--------|
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

> 🔒 **安全驗證**：所有 5 個角色 × 14 個端點的 70/70 自動化權限測試均已通過。
> 請參閱 [TEST_WALLETS.md](TEST_WALLETS.md) 了解測試錢包與驗證步驟。

### 安全架構

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

## 🆕 標準清單 (Standards List) — 已恢復及更新

本章節**恢復並更新** AQTMS 的核心開發與運維標準。所有貢獻與實作**必須嚴格遵守**以下標準。本清單已從先前版本恢復，並進行分類優化及雙語同步。

### 1. 架構標準 (Architecture Standards)
- **Hexagonal + DDD + Clean Architecture**：強制採用。嚴格區分 Domain、Application、Infrastructure、Interface 層。
- **依賴反轉原則 (Dependency Inversion Principle)**：高層模組依賴抽象，而非具體實作。
- **類型安全**：100% TypeScript，**嚴禁使用 `any` 類型**。tsconfig.json 必須啟用 `strict: true`。優先使用 `unknown` + type guard。
- **領域中心設計**：業務邏輯必須位於 Domain 層。Infrastructure 只實作 ports/interfaces。

### 2. 安全標準 (Security Standards)
- **加密**：所有敏感資料（API Keys、機密、PII）必須使用 AES-256-GCM 加密。
- **認證**：JWT Wallet 認證 + 基於 Redis 的 Token 撤銷/刷新機制。
- **授權**：5 角色 RBAC + 明確的權限白名單驗證。資料層必須強制執行所有權驗證。
- **API 保護**：**所有**路由必須啟用 Rate Limiting。使用 Helmet.js 強化 HTTP Header 安全。
- **優雅關閉 (Graceful Shutdown)**：正確處理 SIGTERM/SIGINT 訊號，確保連線優雅關閉。
- **輸入驗證**：所有輸入必須使用嚴格 DTO 驗證（class-validator）。絕不信任客戶端資料。

### 3. 可觀測性標準 (Observability Standards)
- **指標**：Prometheus 同時收集 HTTP 層級與業務層級指標（交易、PnL、風險檢查、執行延遲、部分成交等）。
- **儀表板**：Grafana 建立清晰面板，涵蓋延遲、錯誤率、交易量、風險暴露、Kill Switch 狀態等。
- **日誌**：僅允許結構化 JSON 日誌。生產環境禁止純文字日誌。
- **錯誤追蹤**：整合 Sentry 進行錯誤報告、堆疊追蹤與效能監控（重點關注 p95/p99 延遲）。
- **Kill Switch**：全域緊急停止開關，可即時中止系統所有交易活動。
- **告警**：主動監測異常（如異常回撤、API 錯誤、延遲尖峰）並發出告警。

### 4. 部署與基礎設施標準 (Deployment Standards)
- **本地開發**：Docker Compose 固定使用 6 個服務（app、db、redis 等）。
- **生產環境**：Kubernetes + Helm Charts（最少 2 個 Chart：backend 與 infrastructure）。
- **自動擴容**：啟用 Horizontal Pod Autoscaler (HPA)，基於 CPU/記憶體 + 自訂指標。
- **反向代理**：Nginx 處理 TLS 終止，應用程式端口不得直接暴露。
- **進程管理**：使用 PM2（或等效工具）進行 Node.js 進程管理、叢集與零停機重載。
- **機密管理**：使用 Kubernetes Secrets + 外部機密儲存（例如 Vault 或雲端 KMS）。絕不提交機密至版本控制。

### 5. 代碼質量標準 (Code Quality Standards)
- **格式化與 Lint**：ESLint + Prettier + EditorConfig。使用 Husky + lint-staged 執行 pre-commit 勾點。
- **提交規範**：採用 Conventional Commits（例如 `feat:`、`fix:`、`refactor:`、`docs:`）。
- **測試**：
  - 單元測試（Jest）
  - 整合測試（Supertest + 測試資料庫）
  - 端對端測試（Playwright 或類似工具）
  - 關鍵路徑（風險引擎、執行、認證）最低 80% 覆蓋率
- **API 文件**：使用 OpenAPI/Swagger 自動生成。所有端點必須有文件。
- **錯誤處理**：集中式例外過濾器。絕不將內部錯誤洩露給客戶端。

### 6. 數據與持久化標準 (Data Standards)
- **ORM**：使用 Prisma + PostgreSQL。所有結構變更必須透過 migration 進行（生產環境絕不手動執行 SQL）。
- **快取**：Redis 用於熱資料、Session 與 Token 管理。必須設定適當 TTL 與失效策略。
- **交易**：任何多步驟寫入操作（尤其是交易 + 風險 + 倉位更新）必須使用資料庫交易。
- **靜態加密**：敏感欄位在存入資料庫前必須加密。
- **審計**：所有關鍵操作（交易執行、風險覆寫、使用者權限變更）必須記錄審計日誌。

### 7. 交易與風控引擎標準 (Trading & Risk Standards)
- **風控優先原則**：**每一筆**交易/訂單在執行前**必須**通過 Risk Engine 檢查。嚴禁繞過。
- **模擬交易保真度**：必須忠實模擬真實交易條件：
  - 虛擬餘額持久化（資料庫）
  - 真實滑點模型
  - 手續費模擬（maker/taker）
  - 支援部分成交
  - 實時未實現盈虧計算（透過 MarketDataService + WebSocket）
- **可配置風險規則**：所有風險參數（VaR、倉位限制、每日虧損限制等）必須可透過 UI/API 調整，無需修改程式碼。
- **Kill Switch 整合**：風險引擎必須尊重全域 Kill Switch 狀態。
- **訂單生命週期**：完整狀態機（OPEN → PARTIALLY_FILLED → FILLED/CANCELLED），搭配執行日誌與指標。

### 8. 文檔與協作標準 (Documentation & Collaboration Standards)
- **雙語文檔**：所有主要文件必須同時提供英文與**繁體中文**版本，並保持同步。
- **API 文件**：Swagger UI 必須保持最新，並提供 Postman Collection 匯出。
- **架構決策記錄 (ADRs)**：重大架構決策必須以 ADR 形式記錄。
- **測試錢包與固定資料**：提供文件化的測試帳戶、模擬資料與種子腳本，確保測試可重現。
- **權限矩陣**：清楚定義角色與權限對應矩陣，並維護於文檔中。
- **開發者 onboarding 指南**：提供清晰的開發者入門指南（環境設定、執行測試、本地部署）。

### 9. 通用原則
- **安全與風控優先於功能**：絕不為加速功能交付而犧牲安全或風控。
- **可測試性**：每個模組必須易於單元測試。避免緊密耦合。
- **預設可觀測性**：日誌、指標與追蹤必須從一開始就內建，而非事後補充。
- **快速失敗與優雅降級**：系統必須在關鍵錯誤時快速失敗，並優雅降級（例如停用自動交易但保留監控）。

---

## 🚀 快速開始

### 需求環境

| 依賴項目 | 版本 | 用途 |
|----------|------|------|
| Node.js | ≥ 22 | 執行環境 |
| pnpm | ≥ 10 | 套件管理器 |
| MySQL / PostgreSQL | ≥ 8 | 主要資料庫 |
| Redis | ≥ 7 | 快取、Queue、Session |

### 安裝（開發環境）

```bash
# 1. Clone
git clone git@github.com:yanshekki/AQTMS.git aqtms && cd aqtms

# 2. 安裝依賴
pnpm install

# 3. 設定環境變數
cp apps/backend/.env.example apps/backend/.env
# 編輯 .env —— 填入 DATABASE_URL、JWT_SECRET、ENCRYPTION_KEY (AES-256-GCM)

# 4. 初始化資料庫
cd apps/backend && npx prisma db push && cd ../..

# 5. 啟動（開發模式）
# Backend: http://localhost:3001
cd apps/backend && pnpm dev

# Frontend: http://localhost:5173
cd apps/web && pnpm dev
```

### 使用 Docker Compose（完整生產環境）

```bash
# 啟動所有服務（Backend + Frontend + MySQL/PostgreSQL + Redis + Prometheus + Grafana）
docker-compose up -d

# 存取
# Frontend:  http://localhost
# Backend:   http://localhost:3001
# Grafana:   http://localhost:3000 (admin/admin)
# Metrics:   http://localhost:3001/metrics
```

---

## 🏗 架構

### 後端 — Hexagonal Architecture + DDD + Clean Architecture (NestJS)

```
apps/backend/src/
├── domain/           # 純領域層（entities、value-objects、repository interfaces、業務規則）
├── application/      # 用例層（ExecuteTradeUseCase、ProcessNewsUseCase、RiskEvaluationUseCase、BacktestUseCase）
├── infrastructure/   # 技術實作（Prisma repositories、Exchange Adapters、BeeQueue、AI Providers、MarketDataService、PaperTradingService、KillSwitchService、ReconciliationService）
├── interfaces/       # HTTP/WS 邊界（controllers、dto、middleware、routes、guards）
├── shared/           # 跨領域（errors、logger、config、redis、websocket、metrics、i18n、execution metrics collector）
└── main.ts           # 入口點（AppModule 註冊）
```

**已實作的關鍵服務（最新）：**
- `PaperTradingService`：虛擬餘額、滑點、手續費、部分成交、資料庫持久化
- `MarketDataService`：價格快取 + WebSocket 訂閱（Binance miniTicker）
- `KillSwitchService`：全域緊急停止，搭配從 Portfolio 追蹤每日 PnL
- `ReconciliationService`：交易所持倉對帳
- `ExecutionService`：訂單執行（先通過風險檢查）、部分成交支援、狀態機
- `OrderService`：訂單生命週期管理
- `ExecutionLoggerService` + `ExecutionMetricsCollector`：詳細計時 + 指標
- `BacktestService`：策略註冊表、歷史數據載入器（Binance/Bybit）、完整指標 + 可視化數據
- `RiskService`：VaR、倉位規模、交易前評估、規則引擎

### 前端 — Feature-Sliced Design + Atomic

```
apps/web/src/
├── app/              # Providers、Router、ErrorBoundary、ProtectedRoute
├── features/         # 業務功能（exchange-connect、ai-signals、data-sources、portfolio、backtest）
├── pages/            # 頁面（Dashboard、Exchanges、AISignals、Backtest、Portfolio 等）
├── components/       # 共享元件（layout/Header、ui/、ExchangeCard、DetailDrawer）
├── shared/           # api/、lib/、hooks/、useExchangeConnection、dataSourceApi
└── store/            # Jotai 狀態
```

---

## 📡 API 概覽

> 完整 API 文件請參閱 [docs/api.md](docs/api.md) 或 Swagger UI（位於 `/api/docs`）

**總計 33+ 個端點** —— 全部具備權限中介軟體、速率限制、Zod 驗證，以及使用者範圍/所有權檢查（視情況適用）。

Phase 5+ 近期新增：
- 完整訂單生命週期端點，支援狀態更新與部分成交
- 執行指標與日誌查詢端點（用於監控與除錯）
- 增強的回測端點，回傳權益曲線 + 交易明細 + 指標，供可視化報告使用
- 風險評估 + 倉位規模（4 種演算法：Kelly、Fixed Fractional、ATR-based 等）

---

## 🛠 技術堆疊

### 後端
| 分類 | 技術 |
|------|------|
| 執行環境 | Node.js 22 + TypeScript 5.4（strict） |
| 框架 | **NestJS 10**（Hexagonal + DDD + Clean Architecture） |
| 資料庫 | Prisma 5 + MySQL 8 / PostgreSQL |
| 快取 / Queue | Redis 7（ioredis）+ Bee-Queue（3+ queues） |
| 認證 | JWT + EIP-191 Wallet Signature |
| 驗證 | Zod（所有輸入/輸出） |
| AI | OpenAI · DeepSeek · Grok · Gemini · Ollama |
| 監控 | Prometheus + Prom-client（12+ 指標類型，包含執行延遲、部分成交） |
| WebSocket | Socket.io（JWT 認證 + 5 種事件類型 + 指標） |
| 安全 | Helmet · AES-256-GCM · 全線速率限制 · RBAC（5 角色 × 16 權限）· Token 撤銷 · 所有權驗證 |
| i18n | Accept-Language 標頭偵測（English / 繁體中文） |

### 前端
| 分類 | 技術 |
|------|------|
| 框架 | React 18 + TypeScript 5.4（strict） |
| 建置 | Vite 6 |
| UI | MUI 5 + Emotion |
| 狀態 | @tanstack/react-query + Jotai |
| 圖表 | Recharts + TradingView Lightweight Charts |
| 表單 | React Hook Form + Zod |
| 認證 | Wagmi + WalletConnect + MetaMask |
| WebSocket | Socket.io-client（JWT 認證握手） |
| i18n | react-i18next（English / 繁體中文） |
| 測試 | Vitest + React Testing Library + MSW |

### DevOps
| 分類 | 技術 |
|------|------|
| CI/CD | GitHub Actions（lint → test → build → docker） |
| 容器 | Docker + Docker Compose（6 個服務） |
| 編排 | Kubernetes + Helm（2 個 Chart） |
| 監控 | Prometheus + Grafana + Sentry |
| E2E 測試 | Playwright（12+ 測試案例） |
| 進程管理 | PM2（叢集、零停機重載） |

---

## 🐳 部署

### PM2 進程管理器（推薦）

```bash
# 全域安裝 PM2
npm install -g pm2

# 啟動所有服務（開發模式）
pnpm pm2:start

# 啟動生產模式（先建置前端）
pnpm pm2:start:prod

# 監控進程
pnpm pm2:monit

# 查看日誌
pnpm pm2:logs

# 狀態概覽
pnpm pm2:status

# 優雅重啟（零停機）
pnpm pm2:reload

# 停止全部
pnpm pm2:stop

# 儲存進程列表以便開機自動啟動
pnpm pm2:save
pnpm pm2:startup
```

#### PM2 進程列表

| 進程 | 端口 | 模式 | 記憶體限制 |
|------|------|------|------------|
| `aqtms-backend` | 3001 | fork | 512M |
| `aqtms-frontend-dev` | 5173 | fork | 256M |
| `aqtms-frontend` | 5173 | fork | 128M |

> 📁 完整設定檔：`ecosystem.config.cjs`

### Docker Compose（開發 / 小型生產）

```bash
docker-compose up -d
```

- Backend ×2 replicas
- Frontend ×1（Nginx + SPA）
- MySQL 8.4 / PostgreSQL + Redis 7
- Prometheus + Grafana

### Kubernetes（生產環境）

```bash
# Backend（啟用 HPA 自動擴容）
helm install aqtms-backend ./infra/helm/backend -f values-prod.yaml

# Frontend（啟用 TLS）
helm install aqtms-frontend ./infra/helm/frontend -f values-prod.yaml
```

> 完整部署指南請參閱 [docs/deployment.md](docs/deployment.md)

---

## 🧪 測試

### 權限審計測試

```bash
cd apps/backend && node test-full.cjs
# 5 個角色 × 14 個端點的 70/70 權限測試 ✅
```

### E2E 測試（Playwright）

```bash
cd e2e && npx playwright test
```

### 後端單元與整合測試

```bash
cd apps/backend && pnpm test
```

### 測試覆蓋重點
- 🔐 認證流程 + 權限強制執行（5 角色 × 14+ 端點）
- 💱 Exchange 連線（表單、Modal、測試、所有權）
- 📊 風險引擎（指標、4 種倉位規模演算法、評估）
- 📈 回測引擎（執行、歷史、明細、使用者範圍、可視化數據）
- 📋 評分規則（CRUD、版本歷史、切換、使用者範圍）
- 🔔 通知（列表、標記已讀、使用者範圍）
- 🩺 API 健康 + Prometheus 指標 + 執行指標
- 📋 審計 CSV 導出
- 🛡️ 資料隔離（使用者範圍查詢、控制器 + repo 層所有權檢查）
- 📦 模擬交易完整流程（持久化、滑點、手續費、部分成交、PnL）
- ⚙️ 訂單執行生命週期 + 部分成交 + 對帳

---

## 📊 資料庫結構（Prisma）

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

> 🔒 `apiKey`/`apiSecret` 使用 AES-256-GCM 加密儲存
> 🔒 所有查詢均為使用者範圍，並在資料層執行所有權驗證
> 🔒 模擬交易使用獨立的 `isPaper` 旗標 + 虛擬餘額欄位

---

## 📂 專案結構

```
aqtms/
├── apps/
│   ├── backend/          # NestJS + Hexagonal Architecture（domain / application / infrastructure / interfaces）
│   └── web/              # React 18 + Feature-Sliced Design
├── packages/
│   └── shared-types/     # Zod schemas + TypeScript types
├── infra/
│   └── helm/             # K8s Helm Charts（backend + frontend）
├── e2e/                  # Playwright E2E 測試
├── docs/                 # 架構、API、部署文件
├── .github/
│   └── workflows/        # CI/CD 管線
├── docker-compose.yml    # 6 服務部署
├── prometheus.yml        # Prometheus 抓取設定
├── pnpm-workspace.yaml
├── turbo.json
├── TEST_WALLETS.md       # 測試錢包地址 + 權限矩陣
├── README.md             # 英文（本檔案）
└── README.zh.md          # 繁體中文
```

---

## 🤝 貢獻指南

歡迎貢獻！無論是 Bug Report、Feature Request 或 PR。

### 如何貢獻

1. **Fork** 本倉庫
2. **建立分支**：`git checkout -b feat/amazing-feature`
3. **提交**：`git commit -m 'feat: add amazing feature'`
4. **推送**：`git push origin feat/amazing-feature`
5. **開啟 Pull Request** → 填寫 PR Template

### Issue 模板

| 模板 | 用途 |
|------|------|
| 🐛 [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) | 回報 Bug |
| ✨ [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) | 建議新功能 |
| ❓ [Question](.github/ISSUE_TEMPLATE/question.md) | 一般問題 |

### 提交規範

請使用 [Conventional Commits](https://www.conventionalcommits.org/)：
- `feat:` 新功能
- `fix:` Bug 修復
- `docs:` 文件更新
- `perf:` 效能改善
- `test:` 測試相關
- `chore:` 建置/依賴

### PR 檢查清單

提交 PR 前，請確認：
- [ ] 程式碼遵循專案風格（NestJS Hexagonal + DDD）
- [ ] 無 `any` 類型
- [ ] 權限在 Route / Middleware 層處理
- [ ] API I/O 使用 Zod 驗證
- [ ] 錯誤使用 AppError / BaseExceptionFilter
- [ ] 資料查詢為使用者範圍（視情況適用）
- [ ] 在資料層驗證所有權（視情況適用）
- [ ] 無跨層架構違規
- [ ] 新功能已新增/更新測試

---

## 👤 創作者

**Ki (yanshekki)** —— 全端開發者、量化交易者、[YSK Limited](https://ysk.hk/) 創辦人。

🌐 [linktr.ee/yanshekki](https://linktr.ee/yanshekki) · 🏢 [ysk.hk](https://ysk.hk/)

### ☕ 贊助 / 捐款

如果 AQTMS 對您有幫助，歡迎請我喝杯咖啡！

| 網路 | 地址 |
|------|------|
| **EVM** (ETH/BSC/Polygon) | `yanshekki.eth` |
| **NEAR** | `yanshekki.near` |
| **ADA** (Cardano) | `$yanshekki` |

<p align="center">
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://linktr.ee/yanshekki" alt="yanshekki QR" width="200" />
  <br/>
  <sub>掃描以贊助 → linktr.ee/yanshekki</sub>
</p>

---

## 📄 授權

MIT © AQTMS

---

## ✅ 驗收標準

| 對象 | 時間 | 目標 | 如何達成 |
|------|------|------|----------|
| **開發者** | 30 分鐘 | 成功啟動專案 | `pnpm install` → `cp .env.example .env` → `prisma db push` → `pnpm dev` |
| **投資者** | 5 分鐘 | 了解專案價值 | 閱讀 README 概覽 + 核心功能表 + 標準清單 |
| **使用者** | 10 分鐘 | 完成第一筆交易 | 登入 → Exchange Connect → 查看 AI Signals → 執行回測 → 進行 Paper Trade |
| **審計員** | 5 分鐘 | 驗證安全性 | `node test-full.cjs` → 70/70 通過 + 審查權限矩陣 + 標準清單 |

---

**AQTMS — Let AI trade for you.** 🤖📈

<sub>Powered by [YSK Limited](https://ysk.hk/) — Hong Kong Remote Dev Team & Enterprise Solutions</sub>

---

*本 README 已完整恢復所有先前開發內容（Phase 1-5、模擬交易保真度、執行層強化、回測可視化與指標、Kill Switch、對帳、訂單生命週期等），並更新至 2026 年 5 月最新資料。現已包含完整的「標準清單 (Standards List)」，所有貢獻均必須遵守。中文版 (README.zh.md) 已同步更新。*