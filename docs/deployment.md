# AQTMS 部署指南

## 本地開發

### 環境準備

```bash
# 必要依賴
Node.js ≥ 22
pnpm ≥ 10
MySQL ≥ 8
Redis ≥ 7
```

### 啟動步驟

```bash
# 1. 安裝依賴
pnpm install

# 2. 設定環境變數
cp apps/backend/.env.example apps/backend/.env
# 編輯 .env 填入：
#   DATABASE_URL=mysql://user:pass@localhost:3306/aqtms
#   JWT_SECRET=<32+ 字元隨機字串>
#   ENCRYPTION_KEY=<64 字元 hex，可用 node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 生成>

# 3. 初始化數據庫
cd apps/backend
npx prisma db push
cd ../..

# 4. 啟動後端 (port 3001)
cd apps/backend && pnpm dev

# 5. 啟動前端 (port 5173) — 新 terminal
cd apps/web && pnpm dev
```

訪問：
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health: http://localhost:3001/health

---

## Docker Compose 部署

### 一鍵啟動完整環境

```bash
# 設定環境變數
export DB_ROOT_PASSWORD=SecureRootPass123
export DB_PASSWORD=SecureUserPass123
export JWT_SECRET=your-jwt-secret-at-least-32-chars
export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 啟動
docker-compose up -d

# 查看狀態
docker-compose ps

# 查看日誌
docker-compose logs -f backend
```

### 服務列表

| Service | Port | 說明 |
|---------|------|------|
| **backend** | 3001 | API Server (2 replicas) |
| **frontend** | 80/443 | Nginx + React SPA |
| **mysql** | 3306 | MySQL 8.4 |
| **redis** | 6379 | Redis 7 (256MB, allkeys-lru) |
| **prometheus** | 9090 | Metrics collection |
| **grafana** | 3000 | Dashboards (admin/admin) |

---

## Kubernetes 部署

### 必要條件

- Kubernetes 1.28+
- Helm 3+
- Nginx Ingress Controller
- cert-manager

### 安裝

```bash
# 1. 建立 namespace
kubectl create namespace aqtms

# 2. 建立 secrets
kubectl create secret generic aqtms-secret \
  --namespace aqtms \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --from-literal=ENCRYPTION_KEY=your-64-char-hex-key \
  --from-literal=DATABASE_URL=mysql://aqtms:password@mysql:3306/aqtms

# 3. 部署 Backend（含 HPA 自動擴容）
helm install aqtms-backend ./infra/helm/backend \
  --namespace aqtms \
  -f infra/helm/backend/values.yaml

# 4. 部署 Frontend（含 TLS）
helm install aqtms-frontend ./infra/helm/frontend \
  --namespace aqtms \
  -f infra/helm/frontend/values.yaml

# 5. 檢查狀態
kubectl get pods -n aqtms
kubectl get ingress -n aqtms
```

### 擴容

```bash
# 手動擴容
kubectl scale deployment aqtms-backend --replicas=5 -n aqtms

# 自動擴容（HPA 已啟用：CPU > 70% → max 10 pods）
kubectl get hpa -n aqtms
```

### 更新

```bash
# Rolling Update（零停機）
helm upgrade aqtms-backend ./infra/helm/backend \
  --namespace aqtms \
  --set image.tag=v1.2.0

# 回滾
helm rollback aqtms-backend -n aqtms
```

---

## 監控

### Prometheus + Grafana

```bash
# Grafana 訪問
kubectl port-forward svc/grafana 3000:3000 -n aqtms
# 訪問 http://localhost:3000 (admin/admin)
```

關鍵 Dashboard 面板：
- **API Overview**: 請求量、延遲 p50/p95/p99、錯誤率
- **Trading**: 交易量、成功率、失敗原因
- **AI Pipeline**: AI 呼叫量、延遲、Token 使用、成本
- **Queue Health**: 各隊列 waiting/active/failed 數量
- **System**: CPU、Memory、Network

---

## 安全配置

### TLS 憑證

```bash
# 使用 Let's Encrypt + cert-manager 自動簽發
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@aqtms.io
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

### 環境變數管理

**禁止在程式碼中硬編碼任何 secrets。** 使用以下方式：
- K8s: External Secrets Operator + Vault
- Docker: `.env` 文件（不提交到 Git）
- CI/CD: GitHub Secrets

---

## 災難恢復

### 備份

```bash
# MySQL 備份
mysqldump -u root -p aqtms > backup-$(date +%Y%m%d).sql

# Redis 備份（AOF 模式已啟用）
# 備份 /data/appendonly.aof

# 自動備份 CronJob (K8s)
kubectl apply -f infra/backup-cronjob.yaml
```

### 恢復

```bash
# RTO < 1 小時 / RPO < 15 分鐘
mysql -u root -p aqtms < backup-20260503.sql
```

---

_部署支援：如遇問題，請查閱 [架構文件](architecture.md) 或提交 Issue。_
