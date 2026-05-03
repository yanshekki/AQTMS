# AQTMS API 文件

## Base URL

```
Development: http://localhost:3001
Production:  https://api.aqtms.io
```

## Authentication

所有受保護的 API 需要在 Header 中附帶 JWT Token：

```
Authorization: Bearer <jwt_token>
```

JWT Token 通過 Wallet 簽名流程取得（參閱 [Auth](#auth)）。

---

## Auth

### POST /auth/challenge
請求 Wallet 登入挑戰（nonce）

**Body:**
```json
{ "walletAddress": "0x1234...5678" }
```

**Response:**
```json
{
  "success": true,
  "data": { "message": "AQTMS Login\nWallet: 0x1234...5678\nNonce: abc123..." }
}
```

### POST /auth/authenticate
驗證簽名 → 返回 JWT

**Body:**
```json
{
  "walletAddress": "0x1234...5678",
  "signature": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": "...", "walletAddress": "...", "role": "TRADER", "permissions": [...] }
  }
}
```

**Rate Limit:** 10 req/min per IP

---

## Trades

### POST /api/v1/trades
下單

**Headers:** `Authorization: Bearer <token>`  
**Permissions:** `trade:execute`  
**Rate Limit:** 30 req/min

**Body:**
```json
{
  "exchangeAccountId": "uuid",
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": 0.01,
  "price": 50000,
  "timeInForce": "GTC",
  "idempotencyKey": "uuid-v4"
}
```

**Response:** `201`
```json
{
  "success": true,
  "data": {
    "id": "...",
    "exchangeOrderId": "123456",
    "symbol": "BTCUSDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": 0.01,
    "price": 50000,
    "status": "PENDING",
    "filledQuantity": 0,
    "createdAt": "..."
  }
}
```

### DELETE /api/v1/trades
撤單

**Body:**
```json
{
  "exchangeAccountId": "uuid",
  "symbol": "BTCUSDT",
  "exchangeOrderId": "123456"
}
```

---

## Exchanges

### POST /api/v1/exchanges/connect
連接交易所（API Key 使用 AES-256-GCM 加密儲存）

**Permissions:** `exchange:connect`

**Body:**
```json
{
  "exchange": "BINANCE",
  "name": "My Binance",
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret",
  "testnet": false
}
```

### GET /api/v1/exchanges
列出已連接的交易所

**Permissions:** `exchange:read`

### POST /api/v1/exchanges/:id/test
測試交易所連接（使用解密後的 API Key）

**Permissions:** `exchange:connect`

### DELETE /api/v1/exchanges/:id
刪除交易所連接

---

## Risk

### POST /api/v1/risk/metrics
計算投資組合風險指標

**Body:**
```json
{
  "portfolio": [{
    "asset": "BTC",
    "quantity": 1,
    "currentPrice": 50000,
    "historicalReturns": [0.01, -0.02, 0.03, ...]
  }]
}
```

**Response:**
```json
{
  "data": {
    "portfolioValue": 50000,
    "var95": -1250,
    "var99": -2100,
    "cvar95": -1800,
    "maxDrawdown": 15.3,
    "sharpeRatio": 1.2,
    "concentration": [...],
    "correlationMatrix": [...],
    "betaExposure": [...],
    "riskScore": 45
  }
}
```

### POST /api/v1/risk/position-size
計算倉位大小（4 種算法比較）

**Body:**
```json
{
  "accountSize": 10000,
  "riskPercent": 2,
  "winRate": 0.55,
  "avgWin": 200,
  "avgLoss": 100,
  "stopLossDistance": 100,
  "currentPrice": 50000,
  "atr": 250
}
```

**Response:** `data[]` 包含 4 種算法結果：
- `KELLY_HALF` — 半額 Kelly
- `FIXED_FRACTIONAL` — 固定比例風險
- `FIXED_RATIO` — 固定比率
- `ATR_ADJUSTED` — ATR 調整

### POST /api/v1/risk/evaluate
交易前風險檢查

**Body:**
```json
{
  "trade": { "symbol": "BTC", "quantity": 0.5, "price": 50000 },
  "portfolio": [{ "asset": "BTC", "quantity": 1, "currentPrice": 50000, "historicalReturns": [...] }],
  "dailyPnL": 0
}
```

**Response:**
```json
{
  "data": {
    "allowed": false,
    "violations": ["Trade exceeds single asset limit (50.0% > 25%)"],
    "suggestedSize": 0.25
  }
}
```

---

## Backtest

### POST /api/v1/backtest/run
執行回測（使用 Binance 公開 API 獲取歷史數據）

**Body:**
```json
{
  "symbol": "BTCUSDT",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-04-01T00:00:00.000Z",
  "initialCapital": 10000,
  "feeRate": 0.001,
  "slippagePercent": 0.05,
  "strategyType": "SIMPLE_MA_CROSS",
  "strategyConfig": { "fastPeriod": 9, "slowPeriod": 21, "positionSize": 1 },
  "exchange": "BINANCE"
}
```

**Response:** 完整報告包含：
- `totalReturn`, `winRate`, `sharpeRatio`, `sortinoRatio`, `calmarRatio`
- `equityCurve[]`, `drawdownCurve[]`, `trades[]`, `monthlyReturns[]`

### GET /api/v1/backtest/history
回測歷史（最近 20 個）

### GET /api/v1/backtest/:id
回測完整報告（含圖表數據）

---

## AI & News

### GET /api/v1/ai/providers
列出已註冊的 AI Provider 及健康狀態

### GET /api/v1/news/recent?limit=50&minScore=70&source=TELEGRAM
最近處理的新聞（含 AI 評分）

**Response:**
```json
{
  "data": [{
    "id": "...",
    "source": "TELEGRAM",
    "content": "BTC breaks $50k...",
    "compositeScore": 85.5,
    "truthScore": 90,
    "sentimentScore": 75,
    "relevanceScore": 92,
    "isFake": false,
    "processedAt": "..."
  }]
}
```

### GET /api/v1/news/:id
單條新聞詳細 AI 分析

---

## Audit & Monitoring

### GET /api/v1/audit/export
下載審計日誌 CSV（最近 1000 筆）

**Response:** `Content-Type: text/csv`

### GET /health
健康檢查

### GET /metrics
Prometheus 指標（12 種類型）

---

## Error 格式

所有錯誤返回統一格式：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "symbol", "message": "Required" }]
  },
  "timestamp": "2026-05-03T12:00:00.000Z"
}
```

### 錯誤碼

| Code | HTTP | 說明 |
|------|------|------|
| `VALIDATION_ERROR` | 400 | 輸入驗證失敗 |
| `UNAUTHORIZED` | 401 | 未認證 |
| `FORBIDDEN` | 403 | 權限不足 |
| `NOT_FOUND` | 404 | 資源不存在 |
| `CONFLICT` | 409 | 重複請求 |
| `RATE_LIMITED` | 429 | 請求過多 |
| `CIRCUIT_BREAKER_OPEN` | 503 | 交易所暫時不可用 |
| `INTERNAL_ERROR` | 500 | 伺服器錯誤 |

---

_完整 Swagger/OpenAPI 文件將在 Phase 2 自動生成。_
