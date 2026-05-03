#!/bin/bash
# AQTMS Live Trading Test Helper
# Usage: bash test-helper.sh
# Requires: curl, jq, uuidgen

set -e

API_URL="${API_URL:-http://localhost:3001}"
TOKEN="${AQTMS_TOKEN:-}"
EXCHANGE_ID="${AQTMS_EXCHANGE_ID:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; }
warn() { echo -e "${YELLOW}⚠️  WARN${NC}: $1"; }
info() { echo -e "📋 $1"; }

check_deps() {
  info "Checking dependencies..."
  command -v curl  >/dev/null 2>&1 || { fail "curl not found"; exit 1; }
  command -v jq    >/dev/null 2>&1 || { fail "jq not found"; exit 1; }
  command -v uuidgen >/dev/null 2>&1 || warn "uuidgen not found (will use date-based IDs)"
  pass "Dependencies OK"
}

check_token() {
  if [ -z "$TOKEN" ]; then
    fail "AQTMS_TOKEN not set. Export it first:"
    echo "  export AQTMS_TOKEN=\$(curl -s -X POST $API_URL/auth/authenticate -H 'Content-Type: application/json' -d '{\"walletAddress\":\"0x...\",\"signature\":\"0x...\"}' | jq -r '.data.token')"
    exit 1
  fi
  pass "Token set"
}

check_exchange() {
  if [ -z "$EXCHANGE_ID" ]; then
    warn "AQTMS_EXCHANGE_ID not set. Auto-detecting..."
    EXCHANGE_ID=$(curl -s "$API_URL/api/v1/exchanges" \
      -H "Authorization: Bearer $TOKEN" \
      | jq -r '.data[0].id // empty')
    if [ -z "$EXCHANGE_ID" ]; then
      fail "No exchange connected. Connect Binance first in the UI."
      exit 1
    fi
    export AQTMS_EXCHANGE_ID="$EXCHANGE_ID"
  fi
  pass "Exchange ID: $EXCHANGE_ID"
}

# ── Test 1: Health Check ──
test_health() {
  info "=== Test 0: Health Check ==="
  STATUS=$(curl -s "$API_URL/health" | jq -r '.status')
  if [ "$STATUS" = "ok" ]; then
    pass "Backend healthy"
  else
    fail "Backend unhealthy: $STATUS"
    exit 1
  fi
}

# ── Test 2: Risk Evaluate (should pass) ──
test_risk_pass() {
  info "=== Test 1.4: Risk Check (small order) ==="
  RESULT=$(curl -s -X POST "$API_URL/api/v1/risk/evaluate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "trade": {"symbol": "BTC", "quantity": 0.0004, "price": 50000},
      "portfolio": [{"asset": "USDT", "quantity": 500, "currentPrice": 1, "historicalReturns": [0,0,0,0,0]}],
      "dailyPnL": 0
    }')
  ALLOWED=$(echo "$RESULT" | jq -r '.data.allowed')
  if [ "$ALLOWED" = "true" ]; then
    pass "Risk check passed (small order allowed)"
  else
    VIOLATIONS=$(echo "$RESULT" | jq -r '.data.violations[]')
    fail "Risk check failed: $VIOLATIONS"
  fi
}

# ── Test 3: Manual Market Buy ──
test_market_buy() {
  info "=== Test 1.5: Market Buy ($20 BTC) ==="
  IDEM_KEY=$(uuidgen 2>/dev/null || echo "test-$(date +%s%N)")
  RESULT=$(curl -s -X POST "$API_URL/api/v1/trades" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"exchangeAccountId\": \"$EXCHANGE_ID\",
      \"symbol\": \"BTCUSDT\",
      \"side\": \"BUY\",
      \"type\": \"MARKET\",
      \"quantity\": 0.0004,
      \"timeInForce\": \"GTC\",
      \"idempotencyKey\": \"$IDEM_KEY\"
    }")
  echo "$RESULT" | jq '{id: .data.id, status: .data.status, symbol: .data.symbol, side: .data.side}'
  if echo "$RESULT" | jq -e '.data.id' >/dev/null 2>&1; then
    pass "Market buy order submitted"
  else
    fail "Market buy failed"
    echo "$RESULT" | jq '.error'
  fi
}

# ── Test 4: Risk Evaluate (should BLOCK oversized trade) ──
test_risk_block() {
  info "=== Test 3.1: Risk Block (500% position) ==="
  RESULT=$(curl -s -X POST "$API_URL/api/v1/risk/evaluate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "trade": {"symbol": "BTC", "quantity": 5, "price": 50000},
      "portfolio": [{"asset": "USDT", "quantity": 500, "currentPrice": 1, "historicalReturns": [0,0,0,0,0]}],
      "dailyPnL": 0
    }')
  ALLOWED=$(echo "$RESULT" | jq -r '.data.allowed')
  if [ "$ALLOWED" = "false" ]; then
    VIOLATIONS=$(echo "$RESULT" | jq -r '.data.violations | length')
    SUGGESTED=$(echo "$RESULT" | jq -r '.data.suggestedSize // "N/A"')
    pass "Risk correctly blocked oversized trade ($VIOLATIONS violations, suggested: $SUGGESTED)"
  else
    fail "Risk should have blocked this trade but didn't!"
  fi
}

# ── Test 5: Limit Order + Cancel ──
test_limit_cancel() {
  info "=== Test 4.1: Limit Buy (below market) ==="
  IDEM_KEY=$(uuidgen 2>/dev/null || echo "cancel-$(date +%s%N)")
  RESULT=$(curl -s -X POST "$API_URL/api/v1/trades" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"exchangeAccountId\": \"$EXCHANGE_ID\",
      \"symbol\": \"BTCUSDT\",
      \"side\": \"BUY\",
      \"type\": \"LIMIT\",
      \"quantity\": 0.0002,
      \"price\": 40000,
      \"timeInForce\": \"GTC\",
      \"idempotencyKey\": \"$IDEM_KEY\"
    }")
  echo "$RESULT" | jq '{id: .data.id, type: .data.type, status: .data.status, price: .data.price}'
  ORDER_ID=$(echo "$RESULT" | jq -r '.data.exchangeOrderId // empty')
  if [ -n "$ORDER_ID" ]; then
    pass "Limit order placed: $ORDER_ID"

    info "=== Test 4.2: Cancel Order ==="
    CANCEL_RESULT=$(curl -s -X DELETE "$API_URL/api/v1/trades" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"exchangeAccountId\": \"$EXCHANGE_ID\",
        \"symbol\": \"BTCUSDT\",
        \"exchangeOrderId\": \"$ORDER_ID\"
      }")
    NEW_STATUS=$(echo "$CANCEL_RESULT" | jq -r '.data.status')
    if [ "$NEW_STATUS" = "CANCELLED" ]; then
      pass "Order cancelled successfully"
    else
      fail "Cancel failed: $NEW_STATUS"
    fi
  else
    fail "Limit order placement failed"
  fi
}

# ── Test 6: Market Sell (close position) ──
test_close_position() {
  info "=== Test 4.3: Close Position (sell BTC) ==="
  IDEM_KEY=$(uuidgen 2>/dev/null || echo "close-$(date +%s%N)")
  RESULT=$(curl -s -X POST "$API_URL/api/v1/trades" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"exchangeAccountId\": \"$EXCHANGE_ID\",
      \"symbol\": \"BTCUSDT\",
      \"side\": \"SELL\",
      \"type\": \"MARKET\",
      \"quantity\": 0.0004,
      \"timeInForce\": \"GTC\",
      \"idempotencyKey\": \"$IDEM_KEY\"
    }")
  echo "$RESULT" | jq '{id: .data.id, side: .data.side, status: .data.status}'
  if echo "$RESULT" | jq -e '.data.id' >/dev/null 2>&1; then
    pass "Close position order submitted"
  else
    fail "Close position failed"
    echo "$RESULT" | jq '.error'
  fi
}

# ── Test 7: Audit Export ──
test_audit() {
  info "=== Audit Log Export ==="
  LINES=$(curl -s "$API_URL/api/v1/audit/export" \
    -H "Authorization: Bearer $TOKEN" | wc -l)
  if [ "$LINES" -gt 1 ]; then
    pass "Audit log has $LINES lines (incl. header)"
  else
    warn "Audit log empty or inaccessible"
  fi
}

# ── MAIN ──
echo "========================================="
echo " AQTMS Live Trading Test Suite"
echo " Target: $API_URL"
echo "========================================="

check_deps
check_token
check_exchange

echo ""
test_health
echo ""

echo "⚠️  WARNING: This will execute REAL trades with REAL money."
echo "   Only proceed if you have:"
echo "   - Binance SUB-ACCOUNT with 200-500 USDT"
echo "   - API Key WITHOUT withdrawal permissions"
echo "   - Read the safety notes in docs/live-trading-test.md"
echo ""
read -p "Type 'YES' to continue: " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  warn "Test aborted by user."
  exit 0
fi

echo ""
test_risk_pass
echo ""

echo "⚠️  About to execute REAL MARKET BUY for ~$20 BTC."
read -p "Type 'BUY' to confirm: " CONFIRM_BUY
if [ "$CONFIRM_BUY" != "BUY" ]; then
  warn "Buy test skipped."
else
  test_market_buy
fi

echo ""
test_risk_block
echo ""

echo "⚠️  About to place a LIMIT ORDER (won't fill immediately)."
read -p "Type 'LIMIT' to continue: " CONFIRM_LIMIT
if [ "$CONFIRM_LIMIT" != "LIMIT" ]; then
  warn "Limit/cancel test skipped."
else
  test_limit_cancel
fi

echo ""
echo "⚠️  About to SELL all BTC (close position)."
read -p "Type 'SELL' to confirm: " CONFIRM_SELL
if [ "$CONFIRM_SELL" != "SELL" ]; then
  warn "⚠️  You still have an open BTC position! Close it manually."
else
  test_close_position
fi

echo ""
test_audit
echo ""

echo "========================================="
echo " Test complete."
echo " Remember: Delete API Key from Binance!"
echo "========================================="
