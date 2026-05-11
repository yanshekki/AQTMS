# AQTMS Testing Guide (Updated Phase E)

## Quick Start for New Traders

1. **Connect Wallet** (Frontend)
   - Go to Dashboard
   - Click "Connect Wallet" (EIP-191 signature)
   - Get JWT token automatically

2. **Add Exchange Account**
   - Go to Exchanges page
   - Connect Binance/Bybit (Testnet recommended first)
   - Toggle Paper Trading mode

3. **First Paper Trade**
   - Go to Dashboard (Trading Terminal)
   - Select PAPER mode
   - Place a small MARKET BUY order
   - Check Live Positions table for real-time PnL

4. **Run Backtest**
   - Go to Strategies page
   - Create or select a strategy
   - Click "Run Backtest"
   - Review advanced metrics (Sharpe, Sortino, Expectancy)

5. **Deploy Strategy (Simulated)**
   - On Strategies page, click "Deploy Live"
   - Monitor via Performance Tracking tab

## E2E Test Coverage
- Paper order placement
- Environment validation
- Strategy backtest flow
- Position synchronization
- Kill Switch enforcement

Run all E2E:
```bash
cd apps/backend
pnpm test:e2e
```

## Recommended Test Flow
Paper Trading → Testnet small size → Full Live (with Kill Switch active)
