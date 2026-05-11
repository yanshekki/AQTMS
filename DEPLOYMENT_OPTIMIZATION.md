# AQTMS Production Deployment Optimization (Phase C - Full Observability)

## Grafana Dashboards
- Basic overview: `infra/grafana/aqtms-overview-dashboard.json`
- Full observability (metrics + logs + traces): `infra/grafana/aqtms-full-observability-dashboard.json`

## Loki (Logs)
1. Install Loki + Promtail via Helm
2. Configure Promtail to scrape backend logs
3. Add Loki datasource in Grafana
4. Use LogQL queries in dashboards

## Distributed Tracing (Tempo / Jaeger)
### Backend Configuration
Add to your backend `.env` or Helm values:
```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4317
OTEL_SERVICE_NAME=aqtms-backend
OTEL_TRACES_SAMPLER=always_on
```

### Recommended Setup
- Use OpenTelemetry Collector as sidecar or daemonset
- Export traces to Tempo (Grafana) or Jaeger
- Instrument NestJS with `@opentelemetry/auto-instrumentations-node`

## Full Observability Stack Recommendation
- **Metrics**: Prometheus + Grafana
- **Logs**: Loki + Promtail
- **Traces**: Tempo (or Jaeger)
- **Alerting**: Alertmanager + PagerDuty / Slack

This gives you complete visibility into trading execution, risk decisions, and system health.
