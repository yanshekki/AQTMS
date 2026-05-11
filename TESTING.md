# AQTMS Testing & Deployment Guide (Updated Phase E)

## Quick Start for New Traders

1. Connect Wallet → Get JWT
2. Add Exchange (Testnet first)
3. Use Dashboard Trading Terminal for quick orders (now with advanced order types)
4. Create & Backtest strategies
5. Deploy strategy (now runs with real logic)
6. Monitor Portfolio with allocation pie chart and performance trend

## Key Features
- Portfolio Dashboard with asset allocation visualization and risk alerts
- Strategy Runner with SMA Crossover / Mean Reversion logic
- Professional Trading Terminal with charts and advanced orders

## E2E Test Coverage
- Paper order placement
- Trading terminal flow
- Strategy deployment
- Portfolio summary and positions

Run E2E:
```bash
cd apps/backend
pnpm test:e2e
```

## Recommended Production Flow
Paper Trading → Testnet validation → Small live trades (with Kill Switch enabled)

For full deployment instructions, see DEPLOYMENT_OPTIMIZATION.md
