# AQTMS Deployment Hardening (Step 7)

## Security
- Dockerfile already hardened (non-root, HEALTHCHECK, multi-stage)
- Use Kubernetes Secrets / Vault for API keys
- Enable TLS + rate limiting

## Monitoring & Observability
- Prometheus + Grafana recommended
- Key panels: Kill Switch status, Execution p95 latency, Paper vs Live ratio, Risk violations
- Sample dashboard JSON can be imported from monitoring/grafana-dashboards/

## E2E Tests
- test-full.cjs covers RBAC + paper trading + KillSwitch permission tests
- For full Jest integration: use supertest + NestJS TestingModule (see paper-to-live.e2e-spec.ts pattern)

## Next Recommendations
- Add Prometheus alert rules for kill switch activation
- Harden Helm chart values (securityContext, resource limits)
- Add testnet real execution E2E tests