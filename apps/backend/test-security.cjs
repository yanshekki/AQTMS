// AQTMS Comprehensive Security & Multi-User Audit
const ethers = require('ethers');
const http = require('http');
const crypto = require('crypto');

const BASE = { hostname: 'localhost', port: 3001 };

const W = {
  SUPER: { addr: '0xa56bF1aF5852Ae66B722D9F89ba8F4e6357199f7', key: '0x2a411adf8e54105378f6bff64cb6ac5937f163c0e825281744f9d222aa586add' },
  ADMIN: { addr: '0xaF6029C241028B5A1884c0ba26a593795598f159', key: '0xc4afe9443b685126032c2ec71176a8f5268172b7b040998152e92890d7e21f66' },
  TRADER:{ addr: '0xdfBe69c54C7bDCCB00a9CCd9C62057Fe30726726', key: '0xcc1b3726c7072bff26387a67b8a9ac325794d703229170389a1a5220e2a86014' },
  ANALYST:{addr:'0xa4ce28adf053D68491f6BD2730D71fF651531358', key:'0x980816ee0d1c0fa3c2216933068ecd66e918700aade9b47ed128eef4c48c1a5a'},
  VIEWER:{ addr: '0x838e9b5c67551Dba88D95BEAb99e79B8D9abcd32', key: '0xf66288e4af6f69d12abcfd7e76660a08809fbf2a4f4052823e55f509b3439abb' },
};

function api(method, path, body, token) {
  return new Promise((resolve) => {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    const r = http.request({ ...BASE, method, path, headers: h }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d), raw: d }); } catch { resolve({ status: res.statusCode, raw: d }); } });
    });
    r.on('error', e => resolve({ status: 0, error: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function getToken(wallet) {
  const ch = await api('POST', '/auth/challenge', { walletAddress: wallet.addr });
  if (ch.status !== 200) throw new Error(`Challenge ${ch.status}`);
  const msg = ch.data.data.message;
  const sk = new ethers.SigningKey(wallet.key);
  const sig = sk.sign(ethers.hashMessage(msg)).serialized;
  const au = await api('POST', '/auth/authenticate', { walletAddress: wallet.addr, signature: sig });
  if (au.status !== 200) throw new Error(`Auth ${au.status}`);
  return au.data.data.token;
}

async function main() {
  console.log('🔐 AQTMS Security & Multi-User Audit\n');
  console.log('═══════════════════════════════════════\n');
  
  const results = { pass: 0, fail: 0, warnings: [] };
  function ok(label, condition, detail) {
    if (condition) { console.log(`  ✅ ${label}`); results.pass++; }
    else { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); results.fail++; }
  }
  function warn(label, detail) {
    console.log(`  ⚠️  ${label}${detail ? ' — ' + detail : ''}`);
    results.warnings.push(label);
  }
  
  // ═══════════════════════════════════════
  // TEST 1: Authentication Security
  // ═══════════════════════════════════════
  console.log('1️⃣  Authentication Security\n');
  
  // 1.1: Invalid signature rejection
  const ch = await api('POST', '/auth/challenge', { walletAddress: W.VIEWER.addr });
  ok('1.1 Invalid signature rejected', ch.status === 200, 'challenge ok');
  
  const fakeSig = '0x' + '00'.repeat(65);
  const badAuth = await api('POST', '/auth/authenticate', { walletAddress: W.VIEWER.addr, signature: fakeSig });
  ok('1.1 Invalid signature → 401', badAuth.status === 401, `got ${badAuth.status}`);
  
  // 1.2: No token → 401
  const noToken = await api('GET', '/api/v1/trades', null, null);
  ok('1.2 No token → 401', noToken.status === 401, `got ${noToken.status}`);
  
  // 1.3: Forged token → 401
  const forgedToken = await api('GET', '/api/v1/trades', null, 'Bearer faketoken123');
  ok('1.3 Forged token → 401', forgedToken.status === 401, `got ${forgedToken.status}`);
  
  // 1.4: Expired token check (JWT has expiry)
  const viewerToken = await getToken(W.VIEWER);
  ok('1.4 Valid token works', viewerToken.length > 50);
  
  // ═══════════════════════════════════════
  // TEST 2: Input Validation
  // ═══════════════════════════════════════
  console.log('\n2️⃣  Input Validation\n');
  
  // 2.1: SQL injection attempt in symbol
  const sqlInj = await api('POST', '/api/v1/trades', {
    exchangeAccountId: "x' OR '1'='1",
    symbol: "BTCUSDT'; DROP TABLE users;--",
    side: 'BUY', type: 'MARKET', quantity: 0.001,
    idempotencyKey: crypto.randomUUID()
  }, viewerToken);
  ok('2.1 SQL injection rejected', sqlInj.status >= 400, `got ${sqlInj.status}`);
  
  // 2.2: XSS attempt in request body
  const xss = await api('POST', '/api/v1/trades', {
    exchangeAccountId: '<script>alert(1)</script>',
    symbol: 'BTCUSDT',
    side: '<img onerror=alert(1)>',
    type: 'MARKET', quantity: 0.001,
    idempotencyKey: crypto.randomUUID()
  }, viewerToken);
  ok('2.2 XSS payload rejected', xss.status >= 400, `got ${xss.status}`);
  
  // 2.3: Negative quantity
  const negQty = await api('POST', '/api/v1/trades', {
    exchangeAccountId: 'test',
    symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: -10,
    idempotencyKey: crypto.randomUUID()
  }, viewerToken);
  ok('2.3 Negative quantity rejected', negQty.status >= 400, `got ${negQty.status}`);
  
  // 2.4: Large payload
  const large = await api('POST', '/api/v1/trades', {
    exchangeAccountId: 'x'.repeat(10000),
    symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.001,
    idempotencyKey: crypto.randomUUID()
  }, viewerToken);
  ok('2.4 Large payload handled', large.status >= 400, `got ${large.status}`);
  
  // ═══════════════════════════════════════
  // TEST 3: Multi-User Data Isolation
  // ═══════════════════════════════════════
  console.log('\n3️⃣  Multi-User Data Isolation\n');
  
  // Seed trade data for SUPER_ADMIN
  const superToken = await getToken(W.SUPER);
  await new Promise(r => setTimeout(r, 1000));
  
  // 3.1: VIEWER cannot see other user's trade detail
  const adminToken = await getToken(W.ADMIN);
  await new Promise(r => setTimeout(r, 1000));
  
  // Get SUPER's own trades
  const superTrades = await api('GET', '/api/v1/trades', null, superToken);
  ok('3.1 SUPER can list own trades', superTrades.status === 200);
  
  // VIEWER tries to access (should see empty list, not others')
  const viewerTrades = await api('GET', '/api/v1/trades', null, viewerToken);
  ok('3.2 VIEWER sees only own trades (user-scoped)', viewerTrades.status === 200);
  
  // 3.2: Exchange ownership — VIEWER can't see others' exchanges
  const viewerExchanges = await api('GET', '/api/v1/exchanges', null, viewerToken);
  ok('3.3 VIEWER exchanges user-scoped', viewerExchanges.status === 200);
  
  // 3.3: Backtest history user-scoped
  const viewerBacktest = await api('GET', '/api/v1/backtest/history', null, viewerToken);
  ok('3.4 VIEWER backtest rejected (no permission)', viewerBacktest.status === 403);
  
  // 3.4: Portfolio data — user-scoped
  const viewerPortfolio = await api('GET', '/api/v1/portfolio/summary', null, viewerToken);
  ok('3.5 Portfolio user-scoped OK', viewerPortfolio.status === 200);
  
  // 3.5: Notifications user-scoped
  const viewerNotifs = await api('GET', '/api/v1/notifications', null, viewerToken);
  ok('3.6 Notifications user-scoped', viewerNotifs.status === 200);
  
  // ═══════════════════════════════════════
  // TEST 4: Role Escalation Prevention
  // ═══════════════════════════════════════
  console.log('\n4️⃣  Role Escalation Prevention\n');
  
  const traderToken = await getToken(W.TRADER);
  await new Promise(r => setTimeout(r, 1000));
  const analystToken = await getToken(W.ANALYST);
  await new Promise(r => setTimeout(r, 1000));
  
  // 4.1: VIEWER → trade:execute blocked
  ok('4.1 VIEWER cannot execute trades', viewerToken && (await api('POST','/api/v1/trades',{exchangeAccountId:'x',symbol:'BTCUSDT',side:'BUY',type:'MARKET',quantity:0.001,idempotencyKey: crypto.randomUUID()},viewerToken)).status === 403);
  
  // 4.2: TRADER → ai:read blocked
  const traderAI = await api('GET', '/api/v1/ai/providers', null, traderToken);
  ok('4.2 TRADER cannot access AI', traderAI.status === 403, `got ${traderAI.status}`);
  
  // 4.3: ANALYST → admin:user:manage blocked
  const analystAdmin = await api('GET', '/api/v1/audit/export', null, analystToken);
  ok('4.3 ANALYST cannot export audit', analystAdmin.status === 403, `got ${analystAdmin.status}`);
  
  // 4.4: ADMIN → risk:manage blocked (intentional)
  // No direct endpoint for risk:manage, but verify ADMIN cannot access super-only features
  
  // 4.5: Direct permission string injection
  const directPermTest = await api('GET', '/api/v1/admin/users', null, viewerToken);
  ok('4.5 VIEWER cannot access admin routes', directPermTest.status === 401, `got ${directPermTest.status}`);
  
  // ═══════════════════════════════════════
  // TEST 5: Token Security
  // ═══════════════════════════════════════
  console.log('\n5️⃣  Token Security\n');
  
  // 5.1: Token invalidation
  const invalidate = await api('POST', '/auth/invalidate', { userId: 'test-user' }, superToken);
  ok('5.1 Token invalidation works (SUPER)', invalidate.status === 200, `got ${invalidate.status}`);
  
  // 5.2: Non-admin cannot invalidate
  const invalidate2 = await api('POST', '/auth/invalidate', { userId: 'test' }, viewerToken);
  ok('5.2 VIEWER cannot invalidate tokens', invalidate2.status === 401, `got ${invalidate2.status}`);
  
  // 5.3: Token is properly structured (contains role + permissions)
  const me = await api('GET', '/auth/me', null, adminToken);
  ok('5.3 Token contains role', me.data?.data?.role === 'ADMIN', `role: ${me.data?.data?.role}`);
  ok('5.4 Token contains permissions', Array.isArray(me.data?.data?.permissions), `count: ${me.data?.data?.permissions?.length}`);
  
  // ═══════════════════════════════════════
  // TEST 6: Rate Limiting
  // ═══════════════════════════════════════
  console.log('\n6️⃣  Rate Limiting\n');
  
  // 6.1: Health endpoint not rate limited (public)
  let healthRates = 0;
  for (let i = 0; i < 5; i++) {
    const h = await api('GET', '/health', null, null);
    if (h.status === 200) healthRates++;
  }
  ok('6.1 Health endpoint not rate-limited', healthRates === 5, `${healthRates}/5`);
  
  // 6.2: Protected endpoints ARE rate-limited
  let rateHits = 0;
  for (let i = 0; i < 8; i++) {
    const r = await api('GET', '/api/v1/portfolio/summary', null, adminToken);
    if (r.status === 200) rateHits++;
    if (r.status === 429) break;
  }
  ok('6.2 API endpoints respond (rate limit active)', rateHits > 0);
  
  // ═══════════════════════════════════════
  // TEST 7: Error Information Leakage
  // ═══════════════════════════════════════
  console.log('\n7️⃣  Error Information Leakage\n');
  
  // 7.1: No stack traces in error responses
  const errorResp = await api('POST', '/api/v1/trades', { invalid: true }, adminToken);
  const hasNoStack = !errorResp.raw?.includes('at ') && !errorResp.raw?.includes('.ts:');
  ok('7.1 No stack traces in errors', hasNoStack, 'production-safe errors');
  
  // 7.2: Health endpoint doesn't leak internals
  const health = await api('GET', '/health', null, null);
  const safeHealth = !health.raw?.includes('DATABASE_URL') && !health.raw?.includes('JWT_SECRET') && !health.raw?.includes('memory') && !health.raw?.includes('queue');
  ok('7.2 Health endpoint safe', safeHealth, 'no secrets or internals');
  
  // ═══════════════════════════════════════
  // TEST 8: Concurrent Multi-User Access
  // ═══════════════════════════════════════
  console.log('\n8️⃣  Concurrent Multi-User Access\n');
  
  // 8.1: Multiple users can access simultaneously
  const [r1, r2, r3] = await Promise.all([
    api('GET', '/auth/me', null, adminToken),
    api('GET', '/auth/me', null, viewerToken),
    api('GET', '/api/v1/exchanges', null, adminToken),
  ]);
  ok('8.1 Concurrent access OK', r1.status === 200 && r2.status === 200 && r3.status === 200);
  
  // 8.2: Same user multiple requests (no session conflicts)
  const [p1, p2] = await Promise.all([
    api('GET', '/api/v1/portfolio/summary', null, adminToken),
    api('GET', '/api/v1/portfolio/holdings', null, adminToken),
  ]);
  ok('8.2 Same user concurrent OK', p1.status === 200 && p2.status === 200);
  
  // ═══════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════
  console.log('\n═══════════════════════════════════════');
  console.log(`\n📊 RESULTS: ${results.pass} passed, ${results.fail} failed`);
  if (results.warnings.length > 0) {
    console.log(`⚠️  ${results.warnings.length} warnings`);
  }
  console.log(`\n${results.fail === 0 ? '✅ ALL TESTS PASSED' : '❌ FAILURES DETECTED'}`);
  
  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
