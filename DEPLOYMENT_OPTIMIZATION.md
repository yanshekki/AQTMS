# AQTMS Production Deployment & Monitoring (Phase C)

## Security Hardening
- Non-root user in Dockerfile (already implemented)
- Secrets: Use Kubernetes Secrets + SealedSecrets or External Secrets Operator
- Enable rate limiting in NestJS (ThrottlerModule)
- mTLS between services if scaled horizontally
- Regular dependency scanning (Dependabot + Snyk)

## Monitoring Stack (Recommended)
- **Prometheus** + **Grafana** (core metrics)
- **Alertmanager** for critical alerts (Kill Switch, high risk score, reconciliation discrepancies)
- **Loki** or ELK for centralized logging
- **Tempo** or Jaeger for distributed tracing

## Key Grafana Dashboards
- AQTMS Production Full Monitoring (see monitoring/grafana-dashboards/)
- Panels include: Kill Switch, Execution p95 latency, Paper vs Live ratio, Risk distribution, Reconciliation issues, Daily PnL

## Prometheus Alert Rules (Example)
```yaml
- alert: KillSwitchActive
  expr: kill_switch_active == 1
  for: 1m
  annotations:
    summary: "Kill Switch is active"

- alert: HighExecutionLatency
  expr: histogram_quantile(0.95, rate(execution_duration_seconds_bucket[5m])) > 2
  for: 5m
```

## Scalability & Reliability
- Use BullMQ + Redis for durable queues
- Horizontal Pod Autoscaler for backend
- Database connection pooling (Prisma + PgBouncer)
- Circuit Breaker + Retry already implemented in ExecutionService

## CI/CD Recommendations
- GitHub Actions: lint + test + build + security scan
- Automated Prisma migrations in pipeline
- Canary or Blue-Green deployments

## Production Checklist
- [x] Kill Switch + Risk rules active
- [x] Circuit Breaker + Retry in live path
- [x] Real-time monitoring + alerting
- [ ] Set strong secrets (JWT, Encryption, Exchange API keys)
- [ ] Enable rate limiting
- [ ] Configure Alertmanager routes
- [ ] Set resource limits & requests in Kubernetes
- [ ] Backup strategy for PostgreSQL + Redis
- [ ] Load testing completed
- [ ] Runbook for Kill Switch activation

Phase C focuses on making the system production-ready with robust monitoring and deployment practices.