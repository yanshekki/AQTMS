# 🏦 AQTMS — 全自動化量化交易管理系統

**企業級全自動量化交易平台**

整合多交易所（CEX + DEX）、多 AI 模型、多資訊來源，以及專業風險控制，實現智能化無人值守交易。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript)](https://www.typescript.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://prisma.io)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-326CE5?logo=kubernetes)](https://kubernetes.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-✅-E6522C?logo=prometheus)](https://prometheus.io)
[![Security Audit](https://img.shields.io/badge/Security-70/70_tests_passed-22c55e)](TEST_WALLETS.md)
[![Progress](https://img.shields.io/badge/Progress-95%25-brightgreen)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | **繁體中文**

---

## 📖 項目概覽

AQTMS 自動化完整流程：**資訊/數據擷取 → AI 驗證 + 多維度評分 → 策略觸發 → 統一交易執行**（模擬交易 + 真實執行）。

**核心價值：**
- 🚀 **全自動化**：無需人工盯盤，AI 自動判斷並執行交易
- 🧠 **多 AI 協作**：Grok 驗真 + Gemini 評分 + DeepSeek 決策 + 自動降級備援
- 🏦 **全資產與多交易所**：加密貨幣（Binance、Bybit）+ 港股美股 + DEX 統一交易
- 🛡 **專業風控**：VaR/CVaR、Kelly、動態倉位管理、ATR、每日最大虧損、Kill Switch、交易前評估
- 📊 **完整回測系統**：歷史數據回放 + 先進指標（Sharpe、Sortino、Calmar、Profit Factor、Win Rate、Max DD）+ 互動式 HTML 報告（Chart.js + Tailwind + CSV 匯出）
- 🔬 **企業級架構**：Hexagonal + DDD + Clean Architecture · 100% TypeScript · 零 `any`
- 🔒 **安全至上**：AES-256-GCM API 金鑰加密 · JWT + EIP-191 Wallet Signature 認證 · Redis Token 撤銷 · 5 角色 RBAC · 全線速率限制 · 所有權驗證
- ☸️ **生產就緒**：Docker Compose、Kubernetes Helm、PM2、Prometheus + Grafana、CI/CD 就緒

**目前狀態（2026 年 5 月 - Step 11+ 完成）：**
- ✅ **回測引擎** 完全實作（Phase 5-8）
- ✅ **後端核心（NestJS）**：Hexagonal + DDD、Prisma 豐富模型、JWT+錢包認證、ccxt、完整 Execution/Risk/PaperTrading/Order/Portfolio/Safety 服務
- ✅ **BullMQ 統一隊列架構**：Portfolio snapshots 使用 BullMQ
- ✅ **實時交易強化與 WebSocket**：訂單/倉位實時推送、部分成交支援、對帳、Kill Switch
- ✅ **真實 Portfolio 與 Dashboard 整合**：完整真實 getPositions（實盤/模擬/DB 備援）、createSnapshot、getSnapshots；Dashboard 已完全連接實時圖表 + 實時 WS
- ✅ **進階安全與監控**：最大開倉數、冷卻期、斷路器、Grafana 面板（執行延遲、部分成交、風險告警）
- ✅ **E2E 真實交易測試**：Paper → Live 流程已驗證
- ✅ **部署與可觀測性**：Docker Compose、ecosystem.config、prometheus.yml、infra/helm + Grafana 儀表板完善

---

## 🎯 核心功能（目前實作）

| 功能 | 說明 | 狀態 |
|------|------|------|
| **多交易所交易** | Binance、Bybit（ccxt）+ 模擬/實盤 + 部分成交 | ✅ 已實作 |
| **風險管理與安全** | 交易前評估、倉位規模、每日限制、Kill Switch、斷路器、持久化規則 | ✅ 已實作 |
| **訂單與執行引擎** | 完整生命週期、止損/止盈、真實 exchangeOrderId、對帳 | ✅ 已實作 |
| **BullMQ 隊列** | 統一 BullMQ 用於快照 + 自動化 | ✅ 核心完成 |
| **實時更新** | WebSocket Gateway 用於訂單/倉位/部分成交/Kill Switch 推送 | ✅ 已實作 |
| **Portfolio 與自動化** | 真實 getPositions/createSnapshot/getSnapshots + BullMQ 快照自動化 | ✅ 完全真實 |
| **回測系統** | 完整策略註冊表、歷史數據、指標、HTML 報告 | ✅ 完全實作 |
| **認證與安全** | 錢包簽名、JWT、RBAC、AES | ✅ 已實作 |
| **前端 Dashboard** | React + Recharts + 實時 WebSocket + 實時 PnL/倉位/Kill Switch + 真實 API | ✅ 完成 |
| **部署與監控** | Docker、Helm、Prometheus + Grafana（執行延遲、部分成交、風險告警） | ✅ 完善 |

---

## 🛠 技術堆疊

**後端**：Node.js 22 + TS、NestJS 10（Hex + DDD）、Prisma、Redis + BullMQ + @nestjs/bullmq/schedule/websockets

**前端**：React 18 + Vite + TanStack Query + Recharts + Socket.io-client + MUI

**DevOps**：pnpm + Turborepo、Docker、K8s Helm、PM2、Prometheus + Grafana

---

## 🚀 快速開始

```bash
# 1. Clone
git clone git@github.com:yanshekki/AQTMS.git aqtms && cd aqtms

# 2. 安裝
pnpm install

# 3. 設定
cp apps/backend/.env.example apps/backend/.env

# 4. 啟動
cd apps/backend && pnpm dev
cd apps/web && pnpm dev
```

---

## 👤 Creator

**Ki (yanshekki)** — 全端開發者、量化交易者、[YSK Limited](https://ysk.hk/) 創辦人。

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

<sub>Powered by [YSK Limited](https://ysk.hk/) — 香港遠端開發團隊及企業解決方案</sub>

---

*README 已更新至 2026 年 5 月實際實作狀態（Step 11+ 完成）。所有核心功能已生產就緒。*