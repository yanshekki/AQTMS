# AQTMS 文件索引

## 核心文件

| 文件 | 說明 |
|------|------|
| [README.md](../README.md) | 項目總覽、快速開始、技術棧、部署 |
| [CHANGELOG.md](../CHANGELOG.md) | v1.0.0 發布記錄 |

## 設計與架構

| 文件 | 說明 |
|------|------|
| [architecture.md](architecture.md) | Hexagonal + DDD + Clean Architecture 全架構設計 |
| [api.md](api.md) | 完整 API 參考（Auth · Trade · Exchange · Risk · Backtest · AI · Audit） |

## 操作指南

| 文件 | 說明 |
|------|------|
| [user-guide.md](user-guide.md) | 用戶指南 + Demo 影片腳本（5-8 分鐘） |
| [deployment.md](deployment.md) | Docker Compose + Kubernetes Helm 部署指南 |
| [live-trading-test.md](live-trading-test.md) | 真實小規模交易測試規格（7 Phase） |
| [test-checklist.md](test-checklist.md) | 驗收測試清單 |

## 快速連結

- **GitHub**: https://github.com/yanshekki/RiverPay-Poker
- **API Base URL**: `http://localhost:3001` (dev) / `https://api.aqtms.io` (prod)
- **Frontend**: `http://localhost:5173` (dev) / `https://app.aqtms.io` (prod)
- **Grafana**: `http://localhost:3000` (admin/admin)
- **Prometheus**: `http://localhost:9090`

## 開發工作流

```bash
# 開發
pnpm install
cd apps/backend && cp .env.example .env && npx prisma db push && pnpm dev
cd apps/web && pnpm dev

# 測試
cd apps/backend && npx vitest run          # 單元測試
cd .. && npx playwright test               # E2E 測試

# 類型檢查
cd apps/backend && npx tsc --noEmit
cd apps/web && npx tsc --noEmit

# 部署
docker-compose up -d                        # 一鍵啟動全部服務
```
