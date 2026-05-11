# AQTMS Testing, Documentation & Deployment Guide (Phase E - Final)

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

## Phase E: Testnet + Small Live Testing Guide (實戰測試)

### Recommended Testing Flow

**Step 1: Paper Trading (Safe)**
- Set `currentMode = 'PAPER'` in Dashboard
- All orders go to internal PaperTradingService
- No real funds at risk
- Verify strategy logic, risk rules, Kill Switch

**Step 2: Testnet Validation (Real Market Data)**
- Switch to Testnet mode (`currentMode = 'TESTNET'`)
- Use real testnet API keys from Binance/Bybit testnet
- StrategyRunner will use real market data from testnet
- Execute small test orders on testnet
- Verify real-time WebSocket updates, position reconciliation, partial fills

**Step 3: Small Live Trades (Real Money - Very Small Size)**
- Only after successful testnet validation
- Set `currentMode = 'LIVE'`
- **Start with very small position sizes** (e.g. 0.001 BTC or $10-20 USDT)
- Keep Kill Switch + Risk rules active
- Monitor closely via Dashboard + Grafana

### How to Switch Modes

In Dashboard:
- Click **PAPER** / **TESTNET** / **LIVE** buttons
- LIVE mode shows clear warning: "⚠️ LIVE MODE — Real funds at risk!"

### Enabling Real-time Price Streaming (for Testing)

To get the best real-time experience during testnet/small live testing:

In backend, you can start price streaming for key symbols (e.g. in a bootstrap service or manually via API if exposed):

```ts
// Example (in a service or controller)
await this.marketDataService.startPriceStreaming('BTCUSDT', 'binance', 2000);
await this.marketDataService.startPriceStreaming('ETHUSDT', 'binance', 2000);
```

This will push real-time prices via WebSocket to the Dashboard.

### Testnet Setup (Binance Example)

1. Go to https://testnet.binance.vision/
2. Create API Key (enable Spot Trading)
3. Add the API Key + Secret in Exchange Account page (select Testnet)
4. In backend environment / secrets:
   ```
   ENABLE_TESTNET=true
   BINANCE_TESTNET_API_KEY=your_testnet_key
   BINANCE_TESTNET_API_SECRET=your_testnet_secret
   ```

### What to Test in Testnet + Small Live

- [ ] Real price feed via MarketDataService (with real-time streaming enabled)
- [ ] Strategy auto-execution with real market data
- [ ] Order placement with Stop Loss / Take Profit
- [ ] Real-time WebSocket updates (price, position, order)
- [ ] Position reconciliation with exchange
- [ ] Kill Switch triggering
- [ ] Risk rule enforcement
- [ ] Partial fill handling
- [ ] Error handling & retry logic

### Safety Rules for Small Live Testing

- Always keep **Kill Switch enabled**
- Start with **minimum position size**
- Monitor **unrealized PnL** and alerts closely
- Have a plan to manually close all positions if something goes wrong
- Never test with money you cannot afford to lose

## Frontend E2E Testing

We use **Cypress** for frontend E2E tests.

### How to Run
```bash
cd apps/web
pnpm add -D cypress
npx cypress open
# or
npx cypress run
```

Example tests are in `apps/web/cypress/e2e/`.

Current coverage includes:
- Dashboard loading, mode switching, and WebSocket status
- Portfolio dashboard loading and real-time indicators

### Recommended to Expand
- Full order placement flow (with mocked backend responses)
- Strategy creation and deployment
- Real-time price updates across pages
- Error states and loading handling

## E2E Test Coverage (Strengthened)

### Core Flows Covered
- Paper order placement & execution
- Trading Terminal (Dashboard) full flow
- Strategy deployment + real data evaluation
- Portfolio summary & position updates
- Kill Switch & Risk rule enforcement
- Error handling & retry scenarios
- MarketDataService robustness (caching + retry)
- Multi-exchange support (Binance + Bybit)

### How to Run
```bash
cd apps/backend
pnpm test:e2e
```

Recommended: Run with testnet environment variables for more realistic testing.

## Production Deployment Checklist (Final)

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

For full details, see `PRODUCTION_RUNBOOK.md` and `DEPLOYMENT_OPTIMIZATION.md`

## Recommended Safe Progression
**Paper Trading** → **Testnet Validation** (real market data + real-time streaming) → **Small Live Trades** (with Kill Switch + monitoring)

Always start with small position sizes when going live.
