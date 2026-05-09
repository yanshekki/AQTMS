[English](README.md) | [繁體中文](README.zh.md)

# 🏦 AQTMS — Automated Quantitative Trading Management System

Enterprise-grade fully automated quantitative trading platform — integrating multiple exchanges (CEX + DEX), multiple AI models, multiple data sources, and professional risk control for intelligent unattended trading.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript)](https://www.typescript.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://prisma.io)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-326CE5?logo=kubernetes)](https://kubernetes.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-✅-E6522C?logo=prometheus)](https://prometheus.io)
[![Security Audit](https://img.shields.io/badge/Security-70/70_tests_passed-22c55e)](TEST_WALLETS.md)
[![Progress](https://img.shields.io/badge/Progress-48%25-blue)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 Overview

AQTMS automates the full pipeline: **News Ingestion → AI Verification + Multi-Dimensional Scoring → Strategy Trigger → Unified Trade Execution**.

**Core Value:**
- 🚀 Fully Automated: No manual monitoring — AI judges and executes automatically
- 🧠 Multi-AI Collaboration: Grok verification + Gemini scoring + DeepSeek decision-making + auto-fallback
- 🏦 Multi-Asset: Crypto + HK/US Stocks + DEX unified trading
- 🛡 Professional Risk Control: VaR/CVaR · Kelly · Dynamic Position Sizing · Forced Liquidation Rules
- 📊 **Paper Trading Mode**: Full simulation with virtual balance, slippage, fees, partial fills + real-time PnL (Phase 4)
- 📊 Complete Backtesting: Historical data replay + Sharpe/Sortino/Calmar reports
- 🔬 Enterprise Architecture: Hexagonal + DDD + Clean Architecture · Zero `any` types
- 🔒 Security-First: AES-256-GCM · JWT Wallet Auth · Token Invalidation · 5-Role RBAC · Rate Limiting · Ownership Checks
- ☸️ Production-Ready: K8s Helm · Prometheus · Docker Compose · CI/CD

---

## 🎯 Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Exchange Trading** | Binance · Bybit · Futu · IBKR · Uniswap V3 · PancakeSwap · Raydium | ✅ |
| **AI Scoring Engine** | 5-model collaboration (OpenAI/DeepSeek/Grok/Gemini/Ollama) · Composite score 0-100 → auto-trigger trades | ✅ |
| **Risk Management** | VaR 95%/99% · CVaR · Kelly (Full/Half) · Fixed Fractional · Fixed Ratio · ATR · Risk Rule Engine | ✅ |
| **Paper Trading Mode** | Full simulation engine with virtual balance (persisted), slippage, fees, partial fills, real-time PnL via WebSocket | ✅ (Phase 4) |
| **Backtest System** | MA Cross + Score Threshold strategies · Sharpe/Sortino/Calmar · TradingView integration · Monthly returns | ✅ |
| **Data Sources** | Telegram · X.com real-time monitoring · Auto-scoring + signal trigger → Trade Queue · Live price feed | ✅ |
| **Real-time Push** | WebSocket (Socket.io JWT) · 5 event types: price/signal/order/risk/position · Auto-reconnect | ✅ |
| **Monitoring & Alerts** | Prometheus（HTTP + Business metrics）+ Grafana · Structured Logging · Sentry Error Tracking · p95 latency · Kill Switch monitoring | ✅ |
| **Security & Encryption** | AES-256-GCM API Key encryption · JWT Wallet auth · Redis Token Invalidation · 5-Role RBAC · Rate Limiting (all routes) · Ownership verification (data layer) · **Helmet + Graceful Shutdown** | ✅ |
| **Scoring Rules** | Configurable weight editor (truth/sentiment/relevance/confidence) · Version history · Enable/Disable toggle · PostgreSQL persisted | ✅ |
| **Notification Center** | In-app notification center · Read/Unread · Filter by type · System seeder · PostgreSQL persisted | ✅ |
| **Container Deployment** | Docker Compose (6 services) · K8s Helm (2 charts) · HPA auto-scaling · Nginx · TLS · **Graceful Shutdown** | ✅ |
| **Team Collaboration** | 5 roles · Permission validation (whitelist) · Audit logs · CSV export · Audit trail | ✅ |
| **Complete Documentation** | Bilingual (EN/ZH) · API docs · Architecture docs · User guide · Test wallets · Permission matrix | ✅ |

---

## 🔐 Permission System

... (rest of file remains the same for brevity)