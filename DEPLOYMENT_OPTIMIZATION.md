# AQTMS Production Deployment Optimization (Phase C - Complete Landing)

## Secrets Management (Production Ready)
- Use `existingSecret: aqtms-backend-secrets` in Helm values
- Recommended: External Secrets Operator + AWS Secrets Manager / Vault
- Example manifests available in `infra/external-secrets/`

## Observability Stack (Complete)
### Metrics
- Prometheus + ServiceMonitor + PrometheusRule (enabled by default)

### Logs
- Loki enabled in values
- Use Promtail to collect container logs

### Traces
- OpenTelemetry configured via `OTEL_EXPORTER_OTLP_ENDPOINT`
- Tempo / Jaeger recommended
- Backend now supports OTEL env vars out of the box

### Dashboards
- Basic: `infra/grafana/aqtms-overview-dashboard.json`
- Full Observability: `infra/grafana/aqtms-full-observability-dashboard.json`

## Recommended Production Values
See updated `infra/helm/backend/values.yaml` for production-ready settings including:
- Resource limits & HPA
- SecurityContext (non-root)
- Observability flags
- External Secrets integration

## Quick Production Checklist
- [ ] External Secrets Operator deployed
- [ ] All secrets in ExternalSecret / Vault
- [ ] Prometheus + Grafana + Loki + Tempo running
- [ ] Ingress + TLS configured
- [ ] Kill Switch + Paper Trading flags set correctly
- [ ] ResourceQuotas + NetworkPolicies enabled
