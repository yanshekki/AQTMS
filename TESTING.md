# AQTMS Testing Guide (Testnet + Paper → Live Flow)

## Recommended Testing Flow

### 1. Paper Trading Mode (Safest)
- Set `isPaper: true` in order requests
- Uses `PaperTradingService` with virtual balance + PnL
- No real money at risk
- Recommended for initial strategy validation

### 2. Testnet Mode (Real Exchange, Fake Money)
- Use exchange testnet endpoints (Binance Testnet, Bybit Testnet)
- Set `testnet: true` when creating/updating ExchangeAccount
- System will automatically route to testnet via ccxt
- Real order placement but on testnet (no real funds)

### 3. Live Mode (Real Money) — Only after thorough testing
- `isPaper: false` + real API keys (mainnet)
- **Always** have Kill Switch ready
- Start with very small position sizes
- Monitor Execution Logs + Reconciliation closely

## How to Switch from Paper to Testnet/Live

1. Create or update `ExchangeAccount` with real/testnet API keys (encrypted)
2. In order payload:
   - `isPaper: false`
   - `testnet: true` (for testnet)
   - Or rely on `ExchangeAccount.testnet` flag
3. System will:
   - Skip PaperTradingService
   - Decrypt API keys
   - Initialize ccxt with correct testnet/mainnet setting
   - Apply Circuit Breaker + Retry
   - Check Kill Switch before execution

## Recommended Test Sequence

1. Paper mode → validate strategy logic + PnL calculation
2. Testnet mode → validate real order placement, partial fills, reconciliation
3. Small live orders (with Kill Switch + monitoring)

## Key Things to Monitor
- Execution Logs (Dashboard)
- Kill Switch status
- Reconciliation discrepancies
- Risk breach notifications

## Quick Test Commands / API calls

```json
// Paper order
{
  "isPaper": true,
  "symbol": "BTCUSDT",
  "side": "BUY",
  "quantity": 0.001
}

// Testnet order
{
  "isPaper": false,
  "testnet": true,
  "symbol": "BTCUSDT",
  "side": "BUY",
  "quantity": 0.001
}
```

## Safety Reminders
- Never put large positions on live without extensive testnet validation
- Always have Kill Switch configured and monitored
- Use Reconciliation regularly
- Enable notifications for critical events
