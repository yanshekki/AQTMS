const http = require('http');
const crypto = require('crypto');

const BASE = 'http://localhost:3001';

// Test wallets
const WALLETS = {
  SUPER_ADMIN: { address: '0xa56bF1aF5852Ae66B722D9F89ba8F4e6357199f7', key: '0x2a411adf8e54105378f6bff64cb6ac5937f163c0e825281744f9d222aa586add' },
  ADMIN:       { address: '0xaF6029C241028B5A1884c0ba26a593795598f159', key: '0xc4afe9443b685126032c2ec71176a8f5268172b7b040998152e92890d7e21f66' },
  TRADER:      { address: '0xdfBe69c54C7bDCCB00a9CCd9C62057Fe30726726', key: '0xcc1b3726c7072bff26387a67b8a9ac325794d703229170389a1a5220e2a86014' },
  ANALYST:     { address: '0xa4ce28adf053D68491f6BD2730D71fF651531358', key: '0x980816ee0d1c0fa3c2216933068ecd66e918700aade9b47ed128eef4c48c1a5a' },
  VIEWER:      { address: '0x838e9b5c67551Dba88D95BEAb99e79B8D9abcd32', key: '0xf66288e4af6f69d12abcfd7e76660a08809fbf2a4f4052823e55f509b3439abb' },
};

// Endpoints to test with their expected access per role
// Format: { method, path, body, permissions: { ROLE: true|false } }
const ENDPOINTS = [
  // Public
  { method: 'GET', path: '/health', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 200, ANALYST: 200, VIEWER: 200 } },
  
  // Auth
  { method: 'GET', path: '/auth/me', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 200, ANALYST: 200, VIEWER: 200 } },
  
  // Dashboard portfolio
  { method: 'GET', path: '/api/v1/portfolio/summary', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 200, ANALYST: 200, VIEWER: 200 } },
  { method: 'GET', path: '/api/v1/portfolio/holdings', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 200, ANALYST: 200, VIEWER: 200 } },
  
  // Notifications (user:read)
  { method: 'GET', path: '/api/v1/notifications', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 200, ANALYST: 200, VIEWER: 200 } },
  
  // Exchanges (exchange:read)
  { method: 'GET', path: '/api/v1/exchanges', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 200, ANALYST: 200, VIEWER: 200 } },
  
  // Trades (trade:read)
  { method: 'GET', path: '/api/v1/trades', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 200, ANALYST: 200, VIEWER: 200 } },
  
  // Trade execute (trade:execute)
  { method: 'POST', path: '/api/v1/trades', body: { exchangeAccountId: 'none', symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.001, idempotencyKey: crypto.randomUUID() }, expected: { SUPER_ADMIN: 400, ADMIN: 400, TRADER: 400, ANALYST: 403, VIEWER: 403 } },
  
  // Risk (risk:view)
  { method: 'POST', path: '/api/v1/risk/metrics', body: { portfolio: [] }, expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 200, ANALYST: 200, VIEWER: 403 } },
  
  // Backtest (backtest:run)
  { method: 'GET', path: '/api/v1/backtest/history', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 403, ANALYST: 200, VIEWER: 403 } },
  
  // Scoring rules (scoring:manage)
  { method: 'GET', path: '/api/v1/scoring-rules', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 403, ANALYST: 200, VIEWER: 403 } },
  
  // AI providers (ai:read)
  { method: 'GET', path: '/api/v1/ai/providers', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 403, ANALYST: 200, VIEWER: 403 } },
  
  // News recent (ai:read)
  { method: 'GET', path: '/api/v1/news/recent', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 403, ANALYST: 200, VIEWER: 403 } },
  
  // Audit export (audit:export)
  { method: 'GET', path: '/api/v1/audit/export', expected: { SUPER_ADMIN: 200, ADMIN: 200, TRADER: 403, ANALYST: 403, VIEWER: 403 } },
];

async function fetchJSON(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url, BASE);
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    
    const req = http.request(u, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
      res.on('error', reject);
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken(role) {
  const wallet = WALLETS[role];
  // 1. Get challenge
  const chRes = await fetchJSON('POST', '/auth/challenge', { walletAddress: wallet.address });
  if (chRes.status !== 200) throw new Error(`Challenge failed for ${role}: ${chRes.status}`);
  const chData = JSON.parse(chRes.data);
  const message = chData.data.message;
  
  // 2. Sign message with ethers (from backend node_modules)
  const ethers = require('/root/.openclaw/workspace/aqtms/apps/backend/node_modules/ethers');
  const signingKey = new ethers.SigningKey(wallet.key);
  const signature = signingKey.sign(ethers.hashMessage(message)).serialized;
  
  // 3. Authenticate
  const authRes = await fetchJSON('POST', '/auth/authenticate', { walletAddress: wallet.address, signature });
  if (authRes.status !== 200) throw new Error(`Auth failed for ${role}: ${authRes.status}`);
  const authData = JSON.parse(authRes.data);
  return authData.data.token;
}

async function main() {
  console.log('🔐 AQTMS Permission Audit\n');
  console.log('Getting JWT tokens for all 5 roles...\n');
  
  const tokens = {};
  for (const role of Object.keys(WALLETS)) {
    try {
      tokens[role] = await getToken(role);
      console.log(`  ✅ ${role.padEnd(12)} authenticated`);
    } catch (e) {
      console.log(`  ❌ ${role.padEnd(12)} FAILED: ${e.message}`);
    }
  }
  
  console.log('\n📊 Testing all endpoints...\n');
  
  const results = [];
  let pass = 0, fail = 0;
  
  for (const ep of ENDPOINTS) {
    const label = `${ep.method} ${ep.path}`;
    const row = { endpoint: label, results: {} };
    
    for (const role of Object.keys(WALLETS)) {
      const token = tokens[role];
      if (!token) { row.results[role] = '⏭️'; continue; }
      
      try {
        const res = await fetchJSON(ep.method, ep.path, ep.body, token);
        const expected = ep.expected[role];
        const ok = res.status === expected;
        
        if (ok) {
          row.results[role] = `✅ ${res.status}`;
          pass++;
        } else {
          row.results[role] = `❌ Got ${res.status} expected ${expected}`;
          fail++;
        }
      } catch (e) {
        row.results[role] = `💥 ${e.message}`;
        fail++;
      }
    }
    results.push(row);
  }
  
  // Print table
  const headers = ['Endpoint', 'SUPER_ADMIN', 'ADMIN', 'TRADER', 'ANALYST', 'VIEWER'];
  const colW = [35, 14, 14, 14, 14, 14];
  
  console.log(headers.map((h,i) => h.padEnd(colW[i])).join(''));
  console.log('─'.repeat(colW.reduce((a,b)=>a+b,0)));
  
  for (const r of results) {
    const cols = [r.endpoint, r.results.SUPER_ADMIN||'', r.results.ADMIN||'', r.results.TRADER||'', r.results.ANALYST||'', r.results.VIEWER||''];
    console.log(cols.map((c,i) => c.padEnd(colW[i])).join(''));
  }
  
  console.log(`\n📋 Results: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
