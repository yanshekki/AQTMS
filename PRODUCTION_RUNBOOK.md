# AQTMS Production Runbook (Phase C - Final Operationalization)

## 1. Overview
This runbook provides operational procedures for running AQTMS in production.

**Key Principles**:
- Always keep **Kill Switch** enabled in production.
- Prefer **GitOps** (ArgoCD / Flux) for deployments.
- Monitor via **Grafana + Prometheus + Loki + Tempo**.
- All secrets managed via **External Secrets Operator**.

## 2. Deployment

### Initial Production Deployment
```bash
# 1. Prepare secrets (recommended: External Secrets + Vault)
kubectl create secret generic aqtms-backend-secrets \
  --from-literal=JWT_SECRET=xxx \
  --from-literal=ENCRYPTION_SECRET=xxx \
  --from-literal=DATABASE_URL=xxx \
  --namespace=production

# 2. Deploy with Helm
helm upgrade --install aqtms-backend ./infra/helm/backend \
  --namespace production --create-namespace \
  --set image.tag=latest \
  --set monitoring.enabled=true \
  --set secret.existingSecret=aqtms-backend-secrets \
  --set config.production.enableExternalSecrets=true \
  --set ingress.host=api.aqtms.io
```

### GitOps Deployment (Recommended)
- Store Helm values in Git repo.
- Use ArgoCD Application pointing to the repo.
- Sync policy: `Automated` + `Prune` + `SelfHeal`.

## 3. Monitoring & Alerting

### Key Dashboards
- **System Health**: CPU, Memory, Pod restarts, Error rate
- **Trading Metrics**: Order execution latency, Fill rate, PnL distribution
- **Risk & Safety**: Kill Switch status, Risk rule violations, Daily loss
- **Strategy Performance**: Active strategies, Signal latency, Execution success rate

### Recommended Alerts (PrometheusRule)
```yaml
groups:
- name: aqtms-critical
  rules:
  - alert: KillSwitchActive
    expr: killswitch_active == 1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Kill Switch is ACTIVE"
      description: "Immediate investigation required. Trading may be halted."

  - alert: HighOrderExecutionLatency
    expr: histogram_quantile(0.95, execution_latency_seconds_bucket) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High order execution latency detected"

  - alert: PodCrashLooping
    expr: rate(kube_pod_container_status_restarts_total[5m]) > 0
    for: 5m
    labels:
      severity: critical
```

## 4. Common Operations

### Rolling Restart
```bash
kubectl rollout restart deployment aqtms-backend -n production
```

### View Logs
```bash
# Structured logs via Loki
kubectl logs -l app=aqtms-backend -n production --tail=200

# Or via Grafana Explore (Loki datasource)
```

### Check Kill Switch Status
```bash
curl https://api.aqtms.io/api/safety/kill-switch/status
```

### Manual Emergency Stop (Kill Switch)
```bash
curl -X POST https://api.aqtms.io/api/safety/kill-switch/activate \
  -H "Authorization: Bearer $JWT" \
  -d '{"reason": "Manual emergency stop"}'
```

### Rollback Deployment
```bash
# Helm
helm rollback aqtms-backend 1 -n production

# ArgoCD
argocd app rollback aqtms-production --revision HEAD~
```

## 5. Troubleshooting

### High Latency / Slow Execution
1. Check Grafana → Execution Latency panel
2. Check pod resource usage (CPU throttling?)
3. Check exchange API rate limits
4. Review recent logs for retries or errors

### Kill Switch Triggered Unexpectedly
1. Check alert history in Grafana
2. Review RiskService logs
3. Check daily PnL and position exposure
4. Verify if it was manual or automatic trigger

### WebSocket / Real-time Updates Not Working
1. Check `WebsocketGateway` logs
2. Verify frontend WebSocket connection status
3. Confirm `startPriceStreaming` is active for key symbols
4. Check network policies / ingress WebSocket support

### Database / Redis Connection Issues
1. Check External Secrets mounting
2. Verify DATABASE_URL / REDIS_URL in pod env
3. Check network connectivity to database

## 6. Scaling & Maintenance

### Horizontal Scaling
- HPA is enabled by default (target 70% CPU).
- Adjust in `values.yaml`:
  ```yaml
  hpa:
    maxReplicas: 20
  ```

### Backup & Disaster Recovery
- Database: Use managed PostgreSQL with automated backups.
- Redis: Use managed Redis with persistence.
- Secrets: Stored in Vault / AWS Secrets Manager.
- Git repo is the source of truth for configuration.

## 7. Security Best Practices
- Never commit secrets to Git.
- Use `readOnlyRootFilesystem: true` and non-root user.
- Enable NetworkPolicy to restrict pod-to-pod communication.
- Regularly rotate API keys and JWT secrets.
- Enable audit logging for sensitive operations (Kill Switch, large orders).

## 8. On-call / Incident Response
1. Check Grafana dashboards first.
2. Check recent deployments / config changes.
3. Check Kill Switch status immediately.
4. Escalate if trading is impacted.
5. Document incident in internal wiki.

---

**Last Updated**: 2026-05-11 (Phase C - Final Operationalization)
