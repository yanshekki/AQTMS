# AQTMS Production Deployment Optimization (Phase 6+)

## Secrets Management (Recommended)
- Use `existingSecret` in Helm values
- Prefer **External Secrets Operator** or **Sealed Secrets** in production
- Never commit real API keys or JWT_SECRET to git
- Rotate secrets regularly

## Security Hardening
- Non-root containers (already in values.yaml)
- Read-only root filesystem
- Resource limits + requests
- NetworkPolicies (recommended)
- Pod Security Standards (restricted)

## Monitoring & Alerting
- Prometheus + Grafana already configured
- Critical alerts added:
  - BackendDown
  - KillSwitchActive
  - HighExecutionLatency
  - ReconciliationDiscrepancies
- Set up Alertmanager routes (PagerDuty / Slack / Email)

## Recommended Production Values
```yaml
securityContext:
  runAsNonRoot: true
  readOnlyRootFilesystem: true

secret:
  existingSecret: aqtms-backend-secrets

monitoring:
  prometheusRule: true
```

## Next Steps
- Set up External Secrets Operator
- Configure proper NetworkPolicies
- Add canary/blue-green deployment strategy
- Enable audit logging
