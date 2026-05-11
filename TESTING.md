# AQTMS Testing & Deployment Guide (Updated Phase D)

## Quick Start for New Traders

1. Connect Wallet → Get JWT
2. Add Exchange (Testnet first)
3. Use Dashboard Trading Terminal for quick orders
4. Create & Backtest strategies on Strategies page
5. Deploy strategy (now runs automatically via StrategyRunner)

## E2E Test Coverage
- Paper order placement
- Trading terminal flow
- Strategy deployment
- Environment validation
- Kill Switch & Risk checks

Run E2E:
```bash
cd apps/backend
pnpm test:e2e
```

## CI/CD Pipeline
- Automatic lint, type check, build, and E2E on every push/PR
- Docker image build on main
- Deployment job example included (configure real cluster in CI secrets)

## Recommended Production Flow
Paper Trading → Testnet validation → Small live trades (with Kill Switch enabled)

For full deployment instructions, see DEPLOYMENT_OPTIMIZATION.md
