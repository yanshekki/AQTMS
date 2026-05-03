# AQTMS 系統架構

## 整體架構

AQTMS 採用「**模組化單體**」起步，通過清晰領域邊界實現微服務式解耦，可平滑演進至完整微服務架構。

### 架構原則

- **Hexagonal Architecture**：核心業務邏輯不依賴任何外部技術（資料庫、交易所 API、AI Provider）
- **Domain-Driven Design**：通過聚合、實體、值對象建模業務
- **Clean Architecture**：依賴方向由外向內（interfaces → application → domain）
- **Dependency Injection**：所有依賴通過 constructor 注入（tsyringe），禁止 `new` 關鍵字在核心層

## Backend 分層架構

```
apps/backend/src/
│
├── domain/                          # 純領域層（零外部依賴）
│   ├── entities/                    # Trade, User（領域實體）
│   ├── value-objects/               # Money, Percentage（不可變值對象）
│   └── repositories/                # ITradeRepository（接口定義）
│
├── application/                     # 應用層（用例協調）
│   ├── use-cases/                   # ExecuteTradeUseCase, ProcessNewsUseCase
│   └── services/                    # ScoringEngine, RiskEngine, BacktestService
│
├── infrastructure/                  # 技術實現層（可替換）
│   ├── persistence/                 # PrismaTradeRepository, ExchangeAccountRepository
│   ├── adapters/
│   │   ├── exchanges/               # BinanceAdapter, BybitAdapter, FutuAdapter, IBKRAdapter
│   │   ├── dex/                     # UniswapV3Adapter, PancakeSwapV3Adapter, RaydiumAdapter
│   │   └── datasources/             # TelegramAdapter, XAdapter
│   └── ai-providers/                # OpenAI, DeepSeek, Grok, Gemini, Ollama
│
├── interfaces/                      # 介面層（HTTP/WS 邊界）
│   └── http/
│       ├── controllers/             # TradeController, ExchangeController (thin)
│       ├── dto/                     # Zod schemas + 類型推斷
│       ├── middleware/              # auth, permission(RBAC), validate, metrics, rate-limit
│       └── routes/                  # REST API 路由定義
│
├── shared/                          # 跨層共享
│   ├── errors/                      # AppError 層級（Domain → Validation → Infra）
│   ├── config/                      # Zod 驗證的 env 配置
│   ├── logger/                      # Pino 結構化日誌
│   ├── redis.ts                     # Redis 連接
│   ├── redis-cache.ts               # Redis 快取服務（5 類型）
│   ├── websocket.ts                 # Socket.io 網關
│   ├── metrics.ts                   # Prometheus 指標註冊
│   └── crypto.ts                    # AES-256-GCM 加密工具
│
└── main.ts                          # 入口：DI 註冊 → 啟動服務
```

## Frontend 分層架構

```
apps/web/src/
├── app/                     # 應用級 Providers + Router
│   ├── Providers.tsx        # QueryClient, MUI Theme, ErrorBoundary
│   ├── AppRouter.tsx        # React Router v7
│   ├── ProtectedRoute.tsx   # 權限路由守衛
│   └── ErrorBoundary.tsx    # 全局錯誤邊界
│
├── features/                # 業務功能（完全自包含）
│   ├── exchange-connect/    # 交易所連接管理
│   │   ├── ui/              # ExchangeCard, ConnectModal, ApiKeyForm
│   │   ├── model/           # useExchangeConnection (React Query)
│   │   ├── api/             # exchangeApi (Zod validated)
│   │   └── lib/             # Zod schemas
│   └── ai-signals/          # AI 信號
│       ├── ui/              # SignalsTable, SignalRow, FiltersBar, DetailDrawer
│       ├── model/           # useAISignals (15s auto-refresh)
│       ├── api/             # signalsApi
│       └── lib/             # types
│
├── pages/                   # 頁面容器
│   ├── Dashboard.tsx
│   ├── Exchanges.tsx
│   ├── AISignals.tsx
│   ├── Backtest.tsx
│   └── Login.tsx
│
├── components/              # 共用組件
│   └── layout/              # DashboardHeader, DashboardLayout
│
├── shared/                  # 共享層
│   ├── api/                 # axiosInstance (Zod guarded), authApi
│   └── lib/                 # usePermissions, useWebSocket
│
└── store/                   # Jotai state
    └── auth.ts              # Auth state + localStorage persistence
```

## 數據流架構

### 新聞處理 Pipeline
```
Telegram / X.com (polling)
    ↓
Bee-Queue: news:process (5 workers)
    ↓
AI Pipeline: Grok(verify) → Gemini(score) → DeepSeek(decide)
    ↓ (if score ≥ 80)
Bee-Queue: trade:execute (3 workers)
    ↓
Risk Engine → Unified Adapter → Exchange API
```

### 實時推送
```
Exchange API → Adapter → WebSocket Gateway (Socket.io)
    ├── price:update (per exchange room)
    ├── signal:new   (signals room)
    ├── order:update  (broadcast)
    ├── risk:alert    (per-user room)
    └── position:update (per exchange room)
```

## 技術選型理由

| 選擇 | 理由 |
|------|------|
| **pnpm + Turborepo** | 嚴格的依賴隔離 + 增量構建 |
| **Hexagonal Architecture** | 核心邏輯永不依賴外部，可隨時替換交易所/AI/資料庫 |
| **Zod** (not class-validator) | 靜態類型推斷 + runtime 驗證，前端可共用 |
| **Prisma** (not TypeORM) | 類型安全 + 遷移管理 + 優秀的 DX |
| **Bee-Queue** (not Bull) | 輕量、高效、Redis 原生、支援優先級 |
| **Jotai** (not Redux) | 極簡 API、TypeScript 原生、零樣板 |
| **Recharts** (not D3) | React 原生、宣告式 API、快速集成 |
| **Playwright** (not Cypress) | 多瀏覽器、更快、更穩定 |

## 微服務演進路徑

### Phase 1-2（當前）：模組化單體
- 通過清晰領域邊界實現解耦
- 所有服務在同一進程

### Phase 3：提取高負載服務
- Data Ingestion Service → 獨立部署
- AI Orchestration Service → 獨立擴展
- 引入 NATS 訊息隊列
- API Gateway (Kong/Nginx)

### Phase 4：全量微服務
- 8 獨立服務（User, Exchange, Data, AI, Scoring, Trading, Portfolio, Notification）
- Kubernetes + Istio Service Mesh
- Saga Pattern + Outbox Pattern（分散式交易）
- OpenTelemetry 全鏈路追蹤

---

_架構設計遵循 [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) + [DDD](https://domainlanguage.com/ddd/) + [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)_
