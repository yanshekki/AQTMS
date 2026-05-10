# AQTMS — 全自動化量化交易管理系統

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](README.md) | **繁體中文**

---

## 項目概覽

AQTMS 是一個**企業級全自動量化交易平台**，整合多交易所（CEX + DEX）、多 AI 模型、多資訊來源，以及專業風險控制，實現智能化無人值守交易。

平台自動化完整流程：**資訊擷取 → AI 驗證 + 多維度評分 → 策略觸發 → 統一交易執行**。

### 核心價值
- **全自動化**：無需人工盯盤，AI 自動判斷並執行交易。
- **多 AI 協作**：Grok 驗真 + Gemini 評分 + DeepSeek 決策 + 自動降級備援。
- **全資產支援**：加密貨幣 + 港股美股 + DEX 統一交易。
- **專業風控**：VaR/CVaR · Kelly · 動態倉位管理 · 強制平倉規則。
- **模擬交易模式（Paper Trading）**：完整模擬引擎，支援虛擬餘額持久化、滑點、手續費、部分成交 + 實時未實現盈虧（Phase 4）。
- **完整回測系統**：歷史數據回放 + Sharpe/Sortino/Calmar 報告。
- **企業級架構**：Hexagonal + DDD + Clean Architecture · 零 `any` 類型。
- **安全至上**：AES-256-GCM · JWT Wallet 認證 · Token 撤銷 · 5 角色 RBAC · 全線速率限制 · 所有權驗證。
- **生產就緒**：K8s Helm · Prometheus · Docker Compose · CI/CD。

---

## 核心功能

| 功能 | 說明 | 狀態 |
|------|------|------|
| **多交易所交易** | Binance · Bybit · Futu · IBKR · Uniswap V3 · PancakeSwap · Raydium | ✅ 已完成 |
| **AI 評分引擎** | 5 模型協作（OpenAI/DeepSeek/Grok/Gemini/Ollama）· 綜合評分 0-100 → 自動觸發交易 | ✅ 已完成 |
| **風險管理** | VaR 95%/99% · CVaR · Kelly (Full/Half) · Fixed Fractional · Fixed Ratio · ATR · 風險規則引擎 | ✅ 已完成 |
| **模擬交易模式** | 完整模擬引擎（虛擬餘額持久化、滑點、手續費、部分成交、實時 PnL）（Phase 4） | ✅ 已完成（Phase 4） |
| **回測系統** | MA Cross + Score Threshold 策略 · Sharpe/Sortino/Calmar · TradingView 整合 · 月回報 | ✅ 已完成 |
| **資訊來源** | Telegram · X.com 即時監控 · 自動評分 + 信號觸發 → Trade Queue · 實時價格 | ✅ 已完成 |
| **實時推送** | WebSocket（Socket.io JWT）· price/signal/order/risk/position 5 事件類型 · 自動重連 | ✅ 已完成 |
| **監控告警** | Prometheus（HTTP + Business metrics）+ Grafana · Structured Logging · Sentry Error Tracking · p95 延遲 · Kill Switch 監控 | ✅ 已完成 |
| **安全加密** | AES-256-GCM API Key 加密 · JWT Wallet 認證 · Redis Token 撤銷 · 5 角色 RBAC · 全線速率限制 · 所有權驗證 · Helmet + Graceful Shutdown | ✅ 已完成 |
| **評分規則** | 可配置權重編輯器（真實度/情緒/相關度/可信度）· 版本歷史 · 啟用/停用開關 · PostgreSQL 持久化 | ✅ 已完成 |
| **通知中心** | 應用內通知中心 · 已讀/未讀 · 按類型篩選 · 系統種子 · PostgreSQL 持久化 | ✅ 已完成 |
| **容器部署** | Docker Compose（6 services）· K8s Helm（2 charts）· HPA 自動擴容 · Nginx · TLS · Graceful Shutdown | ✅ 已完成 |
| **團隊協作** | 5 角色 · 權限白名單驗證 · 審計日誌 · CSV 導出 · 審計追蹤 | ✅ 已完成 |
| **完整文檔** | 雙語（中/英）· API 文件 · 架構文件 · 用戶指南 · 測試錢包 · 權限矩陣 | ✅ 已完成 |

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
- **指標**：Prometheus 同時收集 HTTP 層級與業務層級指標（交易、PnL、風險檢查等）。
- **儀表板**：Grafana 建立清晰面板，涵蓋延遲、錯誤率、交易量、風險暴露等。
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
  - 實時未實現盈虧計算
- **可配置風險規則**：所有風險參數（VaR、倉位限制、每日虧損限制等）必須可透過 UI/API 調整，無需修改程式碼。
- **Kill Switch 整合**：風險引擎必須尊重全域 Kill Switch 狀態。

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

## 快速開始

（保留原有快速開始內容，或參考原始版本）

---

## 授權

MIT License

---

*本 README 已恢復並更新，新增完整分類的「標準清單 (Standards List)」，確保未來所有開發工作嚴格遵循項目的架構、安全與品質標準。中文版 (README.zh.md) 已同步更新對應內容。*