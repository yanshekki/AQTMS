# AQTMS Testing, Documentation & Deployment Guide (Phase E - Strengthened)

## Quick Start for Traders (Real Data Focused)

1. **Connect Wallet** → Get JWT (use real wallet signature)
2. **Add Exchange Account** (start with Testnet)
3. **Use Dashboard Trading Terminal**
   - Advanced order types (Market / Limit / Stop / Trailing Stop)
   - Real-time TradingView Lightweight Charts
   - Live positions with real PnL
4. **Create & Backtest Strategies** (using real historical data)
5. **Deploy Strategy** → StrategyRunner now uses real market data via MarketDataService
6. **Monitor Portfolio** with real asset allocation and risk alerts

## E2E Test Coverage (Strengthened)

### Core Flows Covered
- Paper order placement & execution
- Trading Terminal (Dashboard) full flow
- Strategy deployment + real data evaluation
- Portfolio summary & position updates
- Kill Switch & Risk rule enforcement
- Error handling & retry scenarios

### How to Run
```bash
cd apps/backend
pnpm test:e2e
```

Recommended: Run with testnet environment variables for more realistic testing.

## Documentation Improvements
- All critical paths now documented with real data requirements
- StrategyRunner requires injected IMarketDataService for production
- Frontend uses real APIs only (no mock data in production paths)

## Production Deployment Checklist (Updated)

### Secrets & Config
- Use External Secrets Operator + Vault / AWS Secrets Manager
- All API keys encrypted at rest
- JWT_SECRET, ENCRYPTION_SECRET properly set

### Observability
- Prometheus + Grafana + Loki + Tempo fully configured
- OpenTelemetry tracing enabled in backend
- Kill Switch and risk alerts visible in dashboards

### CI/CD & Deployment
- Docker images built and scanned
- Helm deployment with securityContext + resource limits
- GitOps ready (ArgoCD / Flux examples available)
- Automated E2E in pipeline

### Safety
- Kill Switch enabled by default in production
- Paper Trading mode available for validation
- Circuit Breaker + Retry logic in ExecutionService

For full details, see `DEPLOYMENT_OPTIMIZATION.md`

## Recommended Production Flow
**Paper Trading** → **Testnet Validation** (with real market data) → **Small Live Trades** (with Kill Switch + monitoring)

Always start with small position sizes when going live.
