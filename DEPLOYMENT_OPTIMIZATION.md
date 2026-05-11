# AQTMS Production Deployment Optimization (Phase D - Observability)

## Grafana Dashboard
- Added example dashboard: `infra/grafana/aqtms-overview-dashboard.json`
- Covers: Backend health, Kill Switch, Execution latency, Reconciliation issues, Active positions

## Enhanced Alerting
- Added more Prometheus alerts:
  - High memory usage
  - High CPU usage
  - Existing: BackendDown, KillSwitchActive, HighExecutionLatency, ReconciliationDiscrepancies

## Distributed Tracing (Recommended)
For production observability, add OpenTelemetry:

```yaml
# Example env vars for backend
OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4317
OTEL_SERVICE_NAME: aqtms-backend
```

Integrate `@opentelemetry/auto-instrumentations-node` in NestJS for automatic tracing of HTTP, Prisma, Redis, etc.

## Recommended Stack
- Prometheus + Grafana (metrics + dashboards)
- Loki + Promtail (logs)
- Tempo or Jaeger (tracing)
- Alertmanager (alert routing)
