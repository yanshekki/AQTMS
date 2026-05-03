# Step 5：真實小規模交易測試規格

## 1. 目標
使用真實資金進行小額測試，驗證整個自動交易流程在真實市場環境下運作正常。

## 2. 測試範圍

### 2.1 準備工作
- 使用子帳戶（Sub-account）或測試資金
- 準備 **200-500 USDT** 測試資金
- 設定嚴格風險規則（**單筆最大 1%、單日最大 3%**）

### 2.2 前置環境檢查

```bash
# 1. 確保 MySQL + Redis 運行
docker ps | grep mysql && docker ps | grep redis

# 2. 確保後端正常
curl http://localhost:3001/health | jq '.status'  # → "ok"

# 3. 確保前端可訪問
curl -s http://localhost:5173 | head -5

# 4. 檢查 AI Provider 狀態
curl http://localhost:3001/api/v1/ai/providers -H "Authorization: Bearer $TOKEN" | jq '.data[] | {name, isHealthy}'
```

### 2.3 Binance 子帳戶設定

1. 登入 Binance → **Sub-Accounts** → **Create Sub-Account**
2. 轉入 200-500 USDT 到子帳戶
3. 為子帳戶建立 API Key：
   - ✅ **Enable Spot & Margin Trading**
   - ✅ **Enable Reading**
   - ❌ **Disable Withdrawals**
   - ❌ **Disable Futures**
   - ❌ **Disable Margin**
4. 儲存 API Key + Secret
5. **（測試完成後立即刪除 API Key）**

---

## 3. 測試流程

### Test 1：手動觸發測試 — 小額市價單（買入）

| 步驟 | 操作 | 驗收標準 |
|------|------|----------|
| 1.1 | Login → Exchanges → Add Connection → Binance → 貼上 API Key/Secret → Connect | ExchangeCard 顯示 🟢 Connected |
| 1.2 | 查看 ExchangeCard 餘額 | 顯示 200-500 USDT |
| 1.3 | Dashboard 顯示總資產 | 與 Binance 餘額一致 |
| 1.4 | POST /api/v1/risk/evaluate 檢查交易 | `allowed: true`, violations = [] |
| 1.5 | POST /api/v1/trades 買入 $20 BTC（市價） | 201 Created, PENDING → FILLED |
| 1.6 | Dashboard 持倉更新 | 顯示 BTC 持倉 |
| 1.7 | Trade History 頁面 | 有該筆記錄，含 price/quantity/status |
| 1.8 | AuditLog | 有 `trade:execute` 記錄 |

```bash
# Test 1.4 — 風險檢查
curl -s -X POST http://localhost:3001/api/v1/risk/evaluate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trade": {"symbol": "BTC", "quantity": 0.0004, "price": 50000},
    "portfolio": [{"asset": "USDT", "quantity": 500, "currentPrice": 1, "historicalReturns": [0,0,0]}],
    "dailyPnL": 0
  }' | jq '.data.allowed'

# Test 1.5 — 市價買入 $20 BTC
curl -s -X POST http://localhost:3001/api/v1/trades \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"exchangeAccountId\": \"$EXCHANGE_ID\",
    \"symbol\": \"BTCUSDT\",
    \"side\": \"BUY\",
    \"type\": \"MARKET\",
    \"quantity\": 0.0004,
    \"timeInForce\": \"GTC\",
    \"idempotencyKey\": \"$(uuidgen)\"
  }" | jq '.data | {id, status, symbol, side, price}'

# Test 1.8 — 檢查 AuditLog
curl -s http://localhost:3001/api/v1/audit/export \
  -H "Authorization: Bearer $TOKEN" | head -5
```

---

### Test 2：AI 信號觸發測試 — 等待真實新聞 → 自動下單

| 步驟 | 操作 | 驗收標準 |
|------|------|----------|
| 2.1 | 確保 Telegram / X data source 已配置 | GET /health → dataSources > 0 |
| 2.2 | 觀察 AI Signals 頁面（15s refresh） | 新聞顯示 compositeScore |
| 2.3 | 等待一條 compositeScore ≥ 80 的信號 | 信號綠色標記 |
| 2.4 | 檢查 Trade Queue 有 enqueue | GET /health → queues.trade.active > 0 |
| 2.5 | 檢查是否自動下單成功 | Trade History 出現新 trade |
| 2.6 | 檢查 AI 決策 detail | 右側 drawer 顯示多 AI 共識 |

```bash
# Test 2.2-2.3 — 觀察 AI 信號
curl -s "http://localhost:3001/api/v1/news/recent?limit=5&minScore=80" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {source, compositeScore, verdict}'

# Test 2.4 — Queue 狀態
curl -s http://localhost:3001/health | jq '.queues'
```

**注意**：如果無 live data source，可以用以下 command 手動模擬新聞觸發：

```bash
# 模擬新聞插入（通過 prisma）
cd apps/backend
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.newsEvent.create({
  data: {
    source: 'TELEGRAM', sourceId: 'test-' + Date.now(),
    content: 'BTC breaks 80k resistance, massive institutional buying detected. Bull run incoming.',
    language: 'en', isProcessed: false
  }
}).then(n => console.log('News created:', n.id)).finally(() => p.\$disconnect());
"
```

---

### Test 3：風險觸發測試 — 驗證系統拒絕高風險交易

| 步驟 | 操作 | 驗收標準 |
|------|------|----------|
| 3.1 | POST /api/v1/risk/evaluate 超高風險單 | `allowed: false` + violations 列表 |
| 3.2 | 嘗試 POST /api/v1/trades 超過單一資產限制 | 前端顯示拒絕原因 |
| 3.3 | Risk Dashboard 顯示正確風險分數 + 顏色 | Risk Score < 30 綠色 / 30-60 黃色 / >60 紅色 |
| 3.4 | Risk Alert（如有 WebSocket） | 收到 risk:alert event |

```bash
# Test 3.1 — 超大單風險檢查（50% 倉位）
curl -s -X POST http://localhost:3001/api/v1/risk/evaluate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trade": {"symbol": "BTC", "quantity": 5, "price": 50000},
    "portfolio": [{"asset": "USDT", "quantity": 500, "currentPrice": 1, "historicalReturns": [0,0,0]}],
    "dailyPnL": 0
  }' | jq '.data | {allowed, violations, suggestedSize}'

# Test 3.3 — 即時風險指標
curl -s -X POST http://localhost:3001/api/v1/risk/metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"asset": "BTC", "quantity": 0.01, "currentPrice": 80000, "historicalReturns": [0.01,-0.02,0.03,0.01,-0.01,0.02]}
    ]
  }' | jq '.data | {riskScore, var95, maxDrawdown, sharpeRatio}'
```

---

### Test 4：取消 + 平倉測試

| 步驟 | 操作 | 驗收標準 |
|------|------|----------|
| 4.1 | 下限價買入單（低於市價 20%，確保唔會即時成交） | PENDING |
| 4.2 | DELETE /api/v1/trades 取消 | CANCELLED + 資金返回 |
| 4.3 | 如有 BTC 持倉（Test 1 買入），市價賣出平倉 | FILLED |
| 4.4 | Dashboard 持倉歸零 | 0 open positions |

```bash
# Test 4.1 — 限價單（低於市價）
curl -s -X POST http://localhost:3001/api/v1/trades \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"exchangeAccountId\": \"$EXCHANGE_ID\",
    \"symbol\": \"BTCUSDT\",
    \"side\": \"BUY\",
    \"type\": \"LIMIT\",
    \"quantity\": 0.0002,
    \"price\": 40000,
    \"timeInForce\": \"GTC\",
    \"idempotencyKey\": \"$(uuidgen)\"
  }" | jq '.data | {id, type, status, price}'
# 儲存返回嘅 exchangeOrderId

# Test 4.2 — 取消該訂單
curl -s -X DELETE http://localhost:3001/api/v1/trades \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"exchangeAccountId\": \"$EXCHANGE_ID\",
    \"symbol\": \"BTCUSDT\",
    \"exchangeOrderId\": \"$ORDER_ID\"
  }" | jq '.data | {id, status}'

# Test 4.3 — 平倉（賣出 Test 1 買入嘅 BTC）
curl -s -X POST http://localhost:3001/api/v1/trades \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"exchangeAccountId\": \"$EXCHANGE_ID\",
    \"symbol\": \"BTCUSDT\",
    \"side\": \"SELL\",
    \"type\": \"MARKET\",
    \"quantity\": 0.0004,
    \"timeInForce\": \"GTC\",
    \"idempotencyKey\": \"$(uuidgen)\"
  }" | jq '.data | {id, side, status, price}'
```

---

## 4. 測試檢查清單

- [ ] **Test 1**：小額市價單成功下單 + 成交
- [ ] **Test 2**：AI 信號觸發後自動下單（如果評分 ≥ 80）
- [ ] **Test 3**：風險規則正確觸發並阻止高風險交易
- [ ] **Test 4**：取消 + 平倉測試通過
- [ ] 所有操作記錄在 **AuditLog**（GET /api/v1/audit/export）
- [ ] **Dashboard** 實時更新（持倉、盈虧、訂單狀態）
- [ ] **WebSocket** 實時推送正常（order:update、position:update）
- [ ] **錯誤時有清晰提示** + 不影響系統穩定

---

## 5. 安全注意事項

- ⚠️ 只使用極小額（**200-500 USDT**）
- ⚠️ 使用**子帳戶**（Sub-account），唔好用主帳戶
- ⚠️ 測試後**立即平倉或撤單**，唔好留 pending orders
- ⚠️ 測試期間密切監控系統（Dashboard + /health + /metrics）
- ⚠️ 測試完成後建議先轉為紙上交易模式（唔連接交易所）
- ⚠️ Binance 後台立即刪除測試用 API Key
- ⚠️ 確認 API Key 無 Withdrawal 權限

---

## 6. 測試後清理

```bash
# 1. 確認無剩餘持倉
curl -s http://localhost:3001/api/v1/exchanges/$EXCHANGE_ID/positions \
  -H "Authorization: Bearer $TOKEN" | jq '.data.positions'

# 2. 導出完整審計記錄
curl -s http://localhost:3001/api/v1/audit/export \
  -H "Authorization: Bearer $TOKEN" > audit-test-$(date +%Y%m%d).csv

# 3. 刪除交易所連接
curl -s -X DELETE http://localhost:3001/api/v1/exchanges/$EXCHANGE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.data.deleted'

# 4. Binance 後台 → API Management → 刪除測試 API Key
```

---

## 驗收判定

| 結果 | 條件 |
|------|------|
| ✅ **PASS** | 全部 4 項 Test + 全部 8 點 Checklist 通過 |
| ⚠️ **PASS WITH ISSUES** | ≤ 2 項失敗，已記錄原因 |
| ❌ **FAIL** | > 2 項失敗 → 需先修復再重測 |

---

**測試人員：___________  日期：___________  簽名：___________**

---

_測試完成後 → 系統已 ready for 真實小規模自動化交易。_
