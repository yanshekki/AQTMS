# AQTMS Production Deployment Optimization (Phase C - External Secrets)

## External Secrets Operator (Recommended for Production)

We now provide concrete examples under `infra/external-secrets/`.

### 1. Install External Secrets Operator
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
```

### 2. Create SecretStore (AWS Secrets Manager example)
See `infra/external-secrets/secret-store.yaml`

### 3. Create ExternalSecret for Backend
See `infra/external-secrets/external-secret-backend.yaml`

After applying these, your Kubernetes secrets will be automatically synced from AWS Secrets Manager.

## Helm Integration
In your Helm values, use:
```yaml
secret:
  existingSecret: aqtms-backend-secrets
```

This way, sensitive values are never stored in Git or Helm values.

## Next Steps
- Create IAM role + ServiceAccount for External Secrets
- Set up proper Secret rotation policy in AWS
- Add similar ExternalSecret for frontend if needed
