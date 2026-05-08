// apps/backend/scripts/test-exchange-adapter.ts
// Run with: npx tsx apps/backend/scripts/test-exchange-adapter.ts

// Simple script to test real exchange connection and order execution (use TESTNET!)

import 'dotenv/config';
import { BinanceAdapter } from '../src/infrastructure/adapters/exchanges/BinanceAdapter';
import { BybitAdapter } from '../src/infrastructure/adapters/exchanges/BybitAdapter';

async function testBinance() {
  console.log('\n=== Testing BINANCE (Testnet) ===');

  const apiKey = process.env.BINANCE_TEST_API_KEY || process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_TEST_API_SECRET || process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.log('❌ Missing BINANCE_API_KEY or BINANCE_API_SECRET in .env');
    return;
  }

  const adapter = new BinanceAdapter({
    apiKey,
    apiSecret,
    testnet: true, // Always use testnet for testing
  });

  try {
    console.log('Testing connection...');
    const connected = await adapter.testConnection();
    console.log(connected ? '✅ Connection OK' : '❌ Connection failed');

    console.log('Fetching balances...');
    const balances = await adapter.getBalances();
    console.log('Balances:', balances.slice(0, 5));

    // Uncomment below to test a real small MARKET order on testnet (use small quantity!)
    /*
    console.log('Placing test MARKET BUY order (0.001 BTC)...');
    const trade = await adapter.createOrder({
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 0.001,
      idempotencyKey: `test-${Date.now()}`,
    });
    console.log('Trade result:', trade);
    */

  } catch (error) {
    console.error('❌ Binance test failed:', error);
  }
}

async function testBybit() {
  console.log('\n=== Testing BYBIT (Testnet) ===');

  const apiKey = process.env.BYBIT_TEST_API_KEY || process.env.BYBIT_API_KEY;
  const apiSecret = process.env.BYBIT_TEST_API_SECRET || process.env.BYBIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.log('❌ Missing BYBIT_API_KEY or BYBIT_API_SECRET in .env');
    return;
  }

  const adapter = new BybitAdapter({
    apiKey,
    apiSecret,
    testnet: true,
  });

  try {
    console.log('Testing connection...');
    const connected = await adapter.testConnection();
    console.log(connected ? '✅ Connection OK' : '❌ Connection failed');

    console.log('Fetching balances...');
    const balances = await adapter.getBalances();
    console.log('Balances:', balances.slice(0, 5));

    // Uncomment to test small order on Bybit testnet
    /*
    console.log('Placing test MARKET BUY order...');
    const trade = await adapter.createOrder({
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: 0.001,
      idempotencyKey: `test-bybit-${Date.now()}`,
    });
    console.log('Trade result:', trade);
    */

  } catch (error) {
    console.error('❌ Bybit test failed:', error);
  }
}

async function main() {
  console.log('🚀 AQTMS Exchange Adapter Test Script');
  console.log('⚠️  WARNING: Always use TESTNET for testing!');

  await testBinance();
  await testBybit();

  console.log('\n✅ Test completed. Check logs above.');
}

main().catch(console.error);
