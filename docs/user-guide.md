# 📖 AQTMS 用戶指南

> 10 分鐘內完成首次自動化交易！

---

## 目錄

| # | 章節 | 檔案 |
|---|------|------|
| 01 | 註冊與登入 | [01-註冊與登入.md](01-註冊與登入.md) |
| 02 | 連接交易所 | [02-連接交易所.md](02-連接交易所.md) |
| 03 | 設定風險規則 | [03-設定風險規則.md](03-設定風險規則.md) |
| 04 | 查看 AI 信號 | [04-查看-AI-信號.md](04-查看-AI-信號.md) |
| 05 | 執行回測 | [05-執行回測.md](05-執行回測.md) |
| 06 | 查看風險指標 | [06-查看風險指標.md](06-查看風險指標.md) |
| 07 | 常見問題 | [07-常見問題.md](07-常見問題.md) |

---

## 快速開始（10 分鐘）

1. **Login**：Wallet 簽名 → 自動登入
2. **Exchange**：Binance API Key → Add Connection → 測試
3. **Risk**：Risk Dashboard 查看即時風險指標
4. **AI Signals**：觀察 AI 評分新聞（Analyst+ 權限）
5. **Backtest**：執行回測驗證策略
6. **Trade**：手動下單或等 AI 信號自動觸發

---

## 🎬 Demo 影片腳本（5-8 分鐘）

> 使用 **OBS Studio** 或 **Loom** 錄製，1080p 以上，配輕柔背景音樂 + 清晰旁白。

### Segment 1：開頭（30 秒）
**畫面**：AQTMS Logo + 標語動畫  
**旁白**：  
「AQTMS 係一個全自動量化交易管理系統。佢可以自動從 Telegram / X 收集新聞，用多個 AI 模型評分，然後自動喺交易所執行交易。今日我會喺 8 分鐘內帶你睇晒成個流程。」

### Segment 2：註冊與登入（30 秒）
**畫面**：Login 頁面 → Connect Wallet → MetaMask 彈出 → 簽名 → Dashboard  
**旁白**：  
「登入完全免密碼。只需要連接你嘅 Wallet，簽一個名，就即刻入到 Dashboard。簽名唔會消耗任何 Gas。」

**展示重點**：
- Logo 置中
- "Connect Wallet to Login" 按鈕
- 登入後 Dashboard 顯示

### Segment 3：連接交易所（1 分鐘）
**畫面**：Exchanges 頁面 → Add Connection → 選擇 Binance → 貼上 API Key/Secret → Connect → 🟢 Connected  
**旁白**：  
「跟住連接交易所。撳 Add Connection，選擇 Binance，貼上你嘅 API Key 同 Secret，系統會自動測試連接。見到綠色 Connected 就代表成功。」

**展示重點**：
- Exchanges 頁面導航
- Modal 表單填寫
- 自動測試 + 狀態變化
- ExchangeCard 顯示餘額

### Segment 4：設定風險規則（1 分鐘）
**畫面**：Risk Dashboard → Scoring Rules Editor → 調整權重 → Save  
**旁白**：  
「設定風險規則。你見到有 4 個權重可以調整 — Truth、Sentiment、Relevance、Confidence。加埋一定要 100%。設定閾值 ≥ 80，綜合評分超過 80 就會自動觸發交易。」

**展示重點**：
- Risk Score 大數字（顏色變化）
- VaR / CVaR 指標卡
- Scoring Rules 權重 slider
- 觸發閾值 + 動作選擇

### Segment 5：AI 信號 + 自動交易（2 分鐘）
**畫面**：AI Signals 頁面 → 新聞列表 → 點擊高分信號 → Detail Drawer → AI 模型共識 → Trade History 出現自動交易  
**旁白**：  
「呢度係 AI Signals 頁面。每條新聞都經過 3 個 AI 模型協作評分 — Grok 驗真、Gemini 評分、DeepSeek 做最終決策。綜合評分 ≥ 80 嘅信號會自動觸發交易。你見到 Trade History 已經有自動執行嘅記錄。」

**展示重點**：
- Signal list 信號列表 + 顏色
- Detail Drawer（AI 共識 + 各項評分）
- Trade History 顯示自動交易
- Queue health dashboard

### Segment 6：回測展示（1.5 分鐘）
**畫面**：Backtest 頁面 → 設定 BTCUSDT / 3 個月 / $10,000 → Run → Equity Curve + Drawdown → 指標報告  
**旁白**：  
「執行回測。設定 BTCUSDT，今年頭 3 個月，初始資金一萬蚊。用 MA Cross 策略，快線 9、慢線 21。撳 Run Backtest。你見到 Sharpe Ratio、Win Rate、Max Drawdown，仲有 Equity Curve 同 Drawdown 圖。」

**展示重點**：
- 參數設定表單
- Run Backtest 按鈕
- 6 Key Metrics 卡片
- Equity Curve（藍色向上）
- Drawdown Curve（紅色向下）
- Trade List 表格

### Segment 7：風險儀表板（30 秒）
**畫面**：Risk Dashboard → VaR 數值 → 集中度 → Beta 暴露 → 相關性熱力圖 → 對沖建議  
**旁白**：
「最後睇風險儀表板。VaR 95% 同 99% 話你知最差情況會蝕幾多。集中度風險確保你唔會 all-in 單一資產。Beta 暴露顯示你相對大市嘅波動。仲有相關性矩陣，幫你搵對沖機會。」

**展示重點**：
- Risk Score 大數字
- VaR + CVaR + Max DD 指標
- Concentration progress bars
- Beta exposure chips + 對沖建議
- Correlation heatmap

### Segment 8：結尾（30 秒）
**畫面**：AQTMS Logo + GitHub URL + Discord + "讓 AI 為你交易"  
**旁白**：  
「AQTMS 係開源項目，完整源碼喺 GitHub。支援 Docker 一鍵部署，Kubernetes 生產環境都得。文檔齊全，由註冊到 API 參考全部有。撳下面條 Link 開始你嘅量化交易之旅。AQTMS — 讓 AI 為你交易。」

**結尾元素**：
- 🏦 AQTMS Logo
- 🔗 github.com/yanshekki/RiverPay-Poker
- 💬 Discord
- 📧 support@aqtms.io
- 🤖📈 "讓 AI 為你交易"

---

## 錄製要點

| 設定 | 建議 |
|------|------|
| **錄製工具** | OBS Studio（免費）或 Loom |
| **畫質** | 1080p 或以上 |
| **比例** | 16:9 |
| **模式** | Dark Mode（更專業） |
| **滑鼠** | 每個操作有明確移動 + 點擊 |
| **暫停** | 重要數字（Sharpe/Win Rate/P&L）停 2 秒 |
| **旁白** | 清晰，Cantonese / English 皆可 |
| **音樂** | 輕柔背景音樂（Instrumental） |
| **Logo** | 最後 5 秒顯示 AQTMS Logo |

---

_完整技術細節請參閱 [API 文件](api.md) 或 [架構文件](architecture.md)。_
