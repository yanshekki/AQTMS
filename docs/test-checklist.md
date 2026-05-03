# AQTMS 真實交易驗收測試清單

> **安全警告**：僅使用子帳戶 + 極小額資金（10-50 USDT）進行測試。

---

## 📋 測試準備

- [ ] 建立 Binance **子帳戶**（或使用 Testnet）
- [ ] 僅開通 **讀取 + 現貨交易** 權限（關閉提現）
- [ ] 準備 **10-50 USDT** 測試資金
- [ ] 生成 API Key + Secret

---

## 1. 🔐 連接測試

| Test | 步驟 | 預期結果 | ✅ |
|------|------|----------|----|
| 1.1 | 在 Exchanges 頁面新增 Binance 連接 | Modal 顯示成功，ExchangeCard 顯示 🟢 Connected | |
| 1.2 | 查看 AuditLog | 有 `exchange:connect` 記錄，API Key 為加密狀態 | |
| 1.3 | 關閉後再打開 Exchanges 頁面 | 交易所仍在列表中，狀態保持 | |
| 1.4 | 點擊 Test Connection | 顯示 Connected ✓ | |

---

## 2. 📊 餘額同步測試

| Test | 步驟 | 預期結果 | ✅ |
|------|------|----------|----|
| 2.1 | 查看 ExchangeCard 餘額 | 顯示 USDT 餘額（含 locked） | |
| 2.2 | Dashboard 顯示總資產 | 與交易所餘額一致 | |

---

## 3. 💰 交易測試

### 3.1 市價單

| Test | 步驟 | 預期結果 | ✅ |
|------|------|----------|----|
| 3.1.1 | 下單買入 0.001 BTC（約 $50） | 訂單成功提交，狀態 PENDING → FILLED | |
| 3.1.2 | WebSocket 推送 `order:update` | 前端即時更新訂單狀態 | |
| 3.1.3 | Dashboard 持倉更新 | 顯示 0.001 BTC | |
| 3.1.4 | AuditLog 有 `trade:execute` 記錄 | 記錄包含 symbol、side、quantity、price | |

### 3.2 限價單 + 取消

| Test | 步驟 | 預期結果 | ✅ |
|------|------|----------|----|
| 3.2.1 | 下單限價買入（低於市價 10%） | 訂單狀態 PENDING | |
| 3.2.2 | 取消該訂單 | 訂單狀態 CANCELLED | |
| 3.2.3 | 資金返回可用餘額 | 餘額恢復 | |

### 3.3 冪等性測試

| Test | 步驟 | 預期結果 | ✅ |
|------|------|----------|----|
| 3.3.1 | 用同一個 idempotencyKey 發送兩次 | 第二次返回相同結果，不會重複成交 | |

---

## 4. 🛡 風險規則測試

| Test | 步驟 | 預期結果 | ✅ |
|------|------|----------|----|
| 4.1 | 設定單筆最大虧損為 1% | 規則已保存 | |
| 4.2 | 嘗試下單超過 1% 倉位 | 系統拒絕，顯示 violation 原因 | |
| 4.3 | 設定單一資產上限為 10% | 規則已保存 | |
| 4.4 | 嘗試買入使單一資產超過 10% | 系統拒絕 + 提示建議倉位大小 | |
| 4.5 | Risk score 更新 | Dashboard 顯示實時風險分數 | |

---

## 5. 📈 回測測試

| Test | 步驟 | 預期結果 | ✅ |
|------|------|----------|----|
| 5.1 | 設定 BTCUSDT 回測（2025-01 至 2025-04） | 回測成功執行 | |
| 5.2 | 查看報告 | 顯示 Sharpe、Win Rate、Max DD、Profit Factor | |
| 5.3 | 查看 Equity Curve 圖表 | 圖表正常顯示 | |
| 5.4 | 查看 Trade List | 每筆交易顯示 side/price/PnL/reason | |
| 5.5 | 結果保存到 History | GET /api/v1/backtest/history 返回該回測 | |

---

## 6. 🔔 WebSocket 實時推送

| Test | 步驟 | 預期結果 | ✅ |
|------|------|----------|----|
| 6.1 | 連接 WebSocket | Status: connected | |
| 6.2 | Subscribe to signals | 收到 signal:new 事件 | |
| 6.3 | Subscribe to exchange | 收到 price:update 事件 | |
| 6.4 | 下單後收到 order:update | 即時顯示訂單狀態變化 | |
| 6.5 | 觸發風險告警收到 risk:alert | 前端彈出 toast | |
| 6.6 | Heartbeat 正常 | ping/pong 無超時 | |

---

## 7. 📊 監控指標

| Test | 步驟 | 預期結果 | ✅ |
|------|------|----------|----|
| 7.1 | GET /metrics | 返回 Prometheus 格式，含所有自訂指標 | |
| 7.2 | GET /health | 顯示 Redis connected + Queue 狀態 | |
| 7.3 | 查看 http_request_duration | p95 < 200ms | |
| 7.4 | 查看 trade metrics | 交易計數正確 | |

---

## 8. 🧹 清理

| Test | 步驟 | 預期結果 | ✅ |
|------|------|----------|----|
| 8.1 | 平掉所有測試倉位 | 無剩餘持倉 | |
| 8.2 | 取消所有 pending 訂單 | 無 pending 訂單 | |
| 8.3 | 刪除測試 API Key | Exchanges 頁面可刪除 | |
| 8.4 | 導出 Audit CSV | 所有測試操作均記錄 | |

---

## 驗收總結

- 全部 ✅：系統可以開始真實小規模交易
- 部分 ✅：標記失敗項目，修復後重測
- ❌ 超過 3 項：暫緩上線，需先修復

---

**測試完成後建議**：
1. 先轉為紙上交易模式觀察 24 小時
2. 確保所有風險規則正確觸發
3. 小額真實交易後逐步加大倉位

_測試人員：___________ 日期：___________ 簽名：___________
