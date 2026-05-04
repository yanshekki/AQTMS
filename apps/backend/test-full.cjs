const ethers = require('ethers');
const http = require('http');
const crypto = require('crypto');

const WALLETS = {
  SUPER_ADMIN: { address: '0xa56bF1aF5852Ae66B722D9F89ba8F4e6357199f7', key: '0x2a411adf8e54105378f6bff64cb6ac5937f163c0e825281744f9d222aa586add' },
  ADMIN:       { address: '0xaF6029C241028B5A1884c0ba26a593795598f159', key: '0xc4afe9443b685126032c2ec71176a8f5268172b7b040998152e92890d7e21f66' },
  TRADER:      { address: '0xdfBe69c54C7bDCCB00a9CCd9C62057Fe30726726', key: '0xcc1b3726c7072bff26387a67b8a9ac325794d703229170389a1a5220e2a86014' },
  ANALYST:     { address: '0xa4ce28adf053D68491f6BD2730D71fF651531358', key: '0x980816ee0d1c0fa3c2216933068ecd66e918700aade9b47ed128eef4c48c1a5a' },
  VIEWER:      { address: '0x838e9b5c67551Dba88D95BEAb99e79B8D9abcd32', key: '0xf66288e4af6f69d12abcfd7e76660a08809fbf2a4f4052823e55f509b3439abb' },
};

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    const r = http.request({ hostname:'localhost',port:3001,method,path,headers:h }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', e => resolve({ status: 0, body: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function getToken(role) {
  const w = WALLETS[role];
  const ch = await req('POST', '/auth/challenge', { walletAddress: w.address });
  if (ch.status !== 200) throw new Error(`Challenge: ${ch.status}`);
  const d = JSON.parse(ch.body);
  const msg = d.data.message;
  const sk = new ethers.SigningKey(w.key);
  const sig = sk.sign(ethers.hashMessage(msg)).serialized;
  const au = await req('POST', '/auth/authenticate', { walletAddress: w.address, signature: sig });
  if (au.status !== 200) throw new Error(`Auth: ${au.status}`);
  return JSON.parse(au.body).data.token;
}

function expected(role, method, path) {
  // Public
  if (path === '/health') return 200;
  if (path === '/auth/me') return 200;
  
  // All roles have: trade:read, exchange:read, user:read
  if (path === '/api/v1/portfolio/summary') return 200;
  if (path === '/api/v1/portfolio/holdings') return 200;
  if (path === '/api/v1/notifications') return 200;
  if (path === '/api/v1/exchanges') return 200;
  if (path === '/api/v1/trades' && method === 'GET') return 200;
  
  // POST trades: ANALYST, VIEWER lack trade:execute → 403
  if (path === '/api/v1/trades' && method === 'POST') return ['ANALYST','VIEWER'].includes(role) ? 403 : 400;
  
  // risk:view → VIEWER lacks → 403
  if (path === '/api/v1/risk/metrics') return role === 'VIEWER' ? 403 : 200;
  
  // backtest:run, scoring:manage → TRADER, VIEWER lack → 403
  if (path === '/api/v1/backtest/history') return ['TRADER','VIEWER'].includes(role) ? 403 : 200;
  if (path === '/api/v1/scoring-rules') return ['TRADER','VIEWER'].includes(role) ? 403 : 200;
  
  // ai:read → TRADER, VIEWER lack → 403
  if (path === '/api/v1/ai/providers') return ['TRADER','VIEWER'].includes(role) ? 403 : 200;
  if (path === '/api/v1/news/recent') return ['TRADER','VIEWER'].includes(role) ? 403 : 200;
  
  // audit:export → only ADMIN, SUPER_ADMIN have → 403 for others
  if (path === '/api/v1/audit/export') return ['ADMIN','SUPER_ADMIN'].includes(role) ? 200 : 403;
  
  return 200;
}

const TESTS = [
  ['GET',  '/health'],
  ['GET',  '/auth/me'],
  ['GET',  '/api/v1/portfolio/summary'],
  ['GET',  '/api/v1/portfolio/holdings'],
  ['GET',  '/api/v1/notifications'],
  ['GET',  '/api/v1/exchanges'],
  ['GET',  '/api/v1/trades'],
  ['POST', '/api/v1/trades', { exchangeAccountId:'x', symbol:'BTCUSDT', side:'BUY', type:'MARKET', quantity:0.001, idempotencyKey: crypto.randomUUID() }],
  ['POST', '/api/v1/risk/metrics', { portfolio:[] }],
  ['GET',  '/api/v1/backtest/history'],
  ['GET',  '/api/v1/scoring-rules'],
  ['GET',  '/api/v1/ai/providers'],
  ['GET',  '/api/v1/news/recent'],
  ['GET',  '/api/v1/audit/export'],
];

async function main() {
  console.log('🔐 AQTMS Permission Audit\n');
  
  const allResults = {};
  
  for (const role of ['SUPER_ADMIN', 'ADMIN', 'TRADER', 'ANALYST', 'VIEWER']) {
    try {
      const token = await getToken(role);
      console.log(`\n═══ ${role} ═══`);
      const results = [];
      let pass = 0, fail = 0;
      
      for (const [method, path, body] of TESTS) {
        const res = await req(method, path, body || null, token);
        const exp = expected(role, method, path);
        const ok = res.status === exp;
        const icon = ok ? '✅' : '❌';
        const extra = ok ? '' : ` (expected ${exp})`;
        console.log(`  ${icon} ${method.padEnd(4)} ${path.padEnd(38)} → ${res.status}${extra}`);
        if (ok) pass++; else fail++;
        results.push({ method, path, status: res.status, expected: exp, ok });
        await new Promise(r => setTimeout(r, 200));
      }
      
      console.log(`  📊 ${pass}/${pass+fail} passed`);
      allResults[role] = { pass, fail, results };
      
      // Wait for auth rate limit to reset before next role
      if (role !== 'VIEWER') {
        process.stdout.write('  ⏳ Waiting for rate limit reset...');
        await new Promise(r => setTimeout(r, 15000));
        console.log(' done');
      }
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
    }
  }
  
  // Summary
  console.log('\n\n═══ SUMMARY ═══\n');
  let totalPass = 0, totalFail = 0;
  for (const role of ['SUPER_ADMIN', 'ADMIN', 'TRADER', 'ANALYST', 'VIEWER']) {
    const r = allResults[role];
    if (r) {
      console.log(`  ${role.padEnd(12)} ${r.pass}/${r.pass+r.fail} passed`);
      totalPass += r.pass; totalFail += r.fail;
    } else {
      console.log(`  ${role.padEnd(12)} ❌ FAILED`);
      totalFail += TESTS.length;
    }
  }
  
  console.log(`\n  TOTAL: ${totalPass}/${totalPass+totalFail} (${Math.round(totalPass/(totalPass+totalFail)*100)}%)`);
  if (totalFail > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
