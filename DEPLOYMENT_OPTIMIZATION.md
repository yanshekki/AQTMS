# AQTMS Production Deployment Optimization (Updated Phase E)

## CI/CD Pipeline
- GitHub Actions workflow added for:
  - Backend lint + type check + tests
  - Frontend build
  - Helm lint
  - Docker image build (ready for registry push)
- Recommended: Add deployment job with ArgoCD or Flux for GitOps

## External Secrets Management (Recommended for Production)
```yaml
# Example using External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: aqtms-backend-secrets
spec:
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: aqtms-backend-secrets
  data:
    - secretKey: JWT_SECRET
      remoteRef:
        key: aqtms/production
        property: jwt_secret
    # Add other secrets (DB, API keys, etc.)
```

## Better Monitoring
- PrometheusRule with critical alerts already included
- Recommended additions:
  - High memory/CPU alerts
  - Reconciliation failure rate
  - Order execution failure rate
- Centralized logging with Loki + Promtail

## Production Checklist
- [ ] External Secrets Operator deployed
- [ ] All secrets externalized (no hardcoded values)
- [ ] CI/CD pipeline green on main
- [ ] Resource quotas + NetworkPolicies enabled
- [ ] Backup strategy for database
- [ ] Disaster recovery runbook
