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
[![Progress](https://img.shields.io/badge/Progress-48%25-blue)](README.zh.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 項目簡介

AQTMS 從**新聞抓取 → AI 真假判斷 + 多維評分 → 策略觸發 → 統一交易執行**，全流程自動化。

**核心價值：**
- 🚀 全自動化：不需要人手盯盤，AI 自動判斷 + 執行
- 🧠 多 AI 協作：Grok 驗真 + Gemini 評分 + DeepSeek 決策 + 自動降級
- 🏦 全資產：加密貨幣 + 港股美股 + DEX 統一交易
- 🛡 專業風控：VaR/CVaR · Kelly · 動態倉位 · 強制平倉規則
- 📊 **模擬交易模式（Paper Trading）**：完整模擬引擎，支援虛擬餘額持久化、滑點、手續費、部分成交 + 實時未實現盈虧（Phase 4）
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
| **模擬交易模式** | 完整模擬引擎（虛擬餘額持久化、滑點、手續費、部分成交、實時 PnL） | ✅（Phase 4） |
| **回測系統** | MA Cross + Score Threshold 策略 · Sharpe/Sortino/Calmar · TradingView 整合 · 月回報 | ✅ |
| **資訊來源** | Telegram · X.com 即時監控 · 自動評分 + 信號觸發 → Trade Queue · 實時價格 | ✅ |
| **實時推送** | WebSocket（Socket.io JWT）· price/signal/order/risk/position 5 事件類型 · 自動重連 | ✅ |
| **監控告警** | Prometheus（HTTP + Business metrics）+ Grafana · Structured Logging · Sentry Error Tracking · p95 延遲 · Kill Switch 監控 | ✅ |
| **安全加密** | AES-256-GCM API Key 加密 · JWT Wallet 認證 · Redis Token 撤銷 · 5 角色 RBAC · 全線速率限制 · 所有權驗證（數據層）· **Helmet + Graceful Shutdown** | ✅ |
| **評分規則** | 可配置權重編輯器（真實度/情緒/相關度/可信度）· 版本歷史 · 啟用/停用開關 · PostgreSQL 持久化 | ✅ |
| **通知中心** | 應用內通知中心 · 已讀/未讀 · 按類型篩選 · 系統種子 · PostgreSQL 持久化 | ✅ |
| **容器部署** | Docker Compose（6 services）· K8s Helm（2 charts）· HPA 自動擴容 · Nginx · TLS · **Graceful Shutdown** | ✅ |
| **團隊協作** | 5 角色 · 權限白名單驗證 · 審計日誌 · CSV 導出 · 審計追蹤 | ✅ |
| **完整文檔** | 雙語（中/英）· API 文件 · 架構文件 · 用戶指南 · 測試錢包 · 權限矩軸 | ✅ |

---

## 🔐 權限系統

... (rest of file remains the same)