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
- ☸️ 生產就緒：K8s Helm · Prometheus · Docker Compose · CI/CD

---

## 🎯 核心功能

| 功能 | 說明 | 狀態 |
|------|------|------|
| **多交易所交易** | Binance · Bybit · Futu · IBKR · Uniswap V3 · PancakeSwap · Raydium | ✅ |
| **AI 評分引擎** | 5 模型協作（OpenAI/DeepSeek/Grok/Gemini/Ollama）· 綜合評分 0-100 → 自動觸發交易 | ✅ |
| **風險管理** | VaR 95%/99% · CVaR · Kelly (Full/Half) · Fixed Fractional · Fixed Ratio · ATR · 風險規則引擎 | ✅ |
| **回測系統** | MA Cross + Score Threshold 策略 · Sharpe/Sortino/Calmar · 盈虧 + Drawdown 圖 · 月回報 | ✅ |
| **資訊來源** | Telegram · X.com 即時監控 · 自動評分 + 信號觸發 → Trade Queue | ✅ |
| **實時推送** | WebSocket（Socket.io JWT）· price/signal/order/risk/position 5 事件類型 | ✅ |
| **監控告警** | Prometheus（12 metric types）+ Grafana · p95 延遲 · 交易成功率 · Queue 健康 | ✅ |
| **安全加密** | AES-256-GCM API Key 加密 · JWT Wallet 認證 · 5 角色 RBAC · Rate Limiting | ✅ |
| **容器部署** | Docker Compose（6 services）· K8s Helm（2 charts）· HPA 自動擴容 · Nginx · TLS | ✅ |
| **團隊協作** | 5 角色（Super Admin/Admin/Trader/Analyst/Viewer）· 審計日誌 · CSV 導出 | ✅ |
| **完整文檔** | API 文件 · 架構文件 · 用戶指南 · Demo 腳本 · 部署指南 · 交易測試清單 | ✅ |

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
git clone <repo-url> aqtms && cd aqtms

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
├── shared/           # 跨層共用（errors, logger, config, redis, websocket, metrics）
└── main.ts           # 入口
```

### Frontend — Feature-Sliced Design + Atomic

```
apps/web/src/
├── app/              # Providers, Router, ErrorBoundary, ProtectedRoute
├── features/         # 業務功能（exchange-connect, ai-signals）
├── pages/            # 頁面（Dashboard, Exchanges, AISignals, Backtest）
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

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/health` | 健康檢查 + Redis + Queue 狀態 |
| GET | `/metrics` | Prometheus metrics |
| POST | `/auth/challenge` | Wallet 登入挑戰 |
| POST | `/auth/authenticate` | 簽名驗證 → JWT |
| POST | `/api/v1/trades` | 下單 |
| DELETE | `/api/v1/trades` | 撤單 |
| POST | `/api/v1/exchanges/connect` | 連接交易所（AES-256 加密） |
| GET | `/api/v1/exchanges` | 已連接交易所列表 |
| POST | `/api/v1/exchanges/:id/test` | 測試連接 |
| POST | `/api/v1/risk/metrics` | 計算風險指標 |
| POST | `/api/v1/risk/position-size` | 倉位計算（4 算法） |
| POST | `/api/v1/risk/evaluate` | 交易前風險檢查 |
| POST | `/api/v1/backtest/run` | 執行回測 |
| GET | `/api/v1/backtest/history` | 回測歷史 |
| GET | `/api/v1/ai/providers` | AI Provider 狀態 |
| GET | `/api/v1/news/recent` | 最新 AI 評分新聞 |
| GET | `/api/v1/audit/export` | 審計日誌 CSV 下載 |

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
| Monitoring | Prometheus + Prom-client (12 metric types) |
| WebSocket | Socket.io (JWT auth + 5 event types) |
| Security | Helmet · AES-256-GCM · Rate Limiting · RBAC |
| i18n | Accept-Language 頭部辨識（en / 繁體中文） |

### Frontend
| 類別 | 技術 |
|------|------|
| Framework | React 18 + TypeScript 5.4 (strict) |
| Build | Vite 6 |
| UI | MUI 5 + Tailwind CSS 3 |
| State | @tanstack/react-query + Jotai |
| Charts | Recharts |
| Form | React Hook Form + Zod |
| Auth | Wagmi + WalletConnect + MetaMask |
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

### E2E Tests (Playwright)

```bash
cd e2e && npx playwright test
```

### Backend Unit Tests

```bash
cd apps/backend && pnpm test
```

### 測試覆蓋

- 🔐 Auth flow (login, redirect)
- 💱 Exchange connect (form, modal, test)
- 📊 Risk engine (metrics, position size, evaluate)
- 📈 Backtest engine (run, history, detail)
- 🩺 API health + Prometheus metrics
- 📋 Audit CSV export

---

## 📊 數據庫 Schema

```
User (id, walletAddress, role, permissions)
ExchangeAccount (id, userId, exchange, apiKey🛡️, apiSecret🛡️)
Trade (id, symbol, side, type, status, idempotencyKey)
AuditLog (id, userId, action, resource, resourceId, ip)
NewsEvent (id, source, content, compositeScore, aiAnalysis)
BacktestReport (id, symbol, totalReturn, sharpeRatio, equityCurve)
```

> 🔒 `apiKey`/`apiSecret` 使用 AES-256-GCM 加密儲存

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
└── README.md
```

---

## 🤝 貢獻

歡迎貢獻！無論係 Bug Report、Feature Request 定係 PR。

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
- [ ] 無跨層架構違反

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

---

## 🏢 團隊

AQTMS 由專業量化開發團隊構建。如需商業支持或定制開發，請聯繫我們。

---

**AQTMS — 讓 AI 為你交易。** 🤖📈
