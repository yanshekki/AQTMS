const ethers = require('ethers');
const http = require('http');
const crypto = require('crypto');

const BASE = { hostname: 'localhost', port: 3001 };
const WALLETS = {
  SUPER_ADMIN: { address: '0xa56bF1aF5852Ae66B722D9F89ba8F4e6357199f7', key: '0x2a411adf8e54105378f6bff64cb6ac5937f163c0e825281744f9d222aa586add' },
  ADMIN:       { address: '0xaF6029C241028B5A1884c0ba26a593795598f159', key: '0xc4afe9443b685126032c2ec71176a8f5268172b7b040998152e92890d7e21f66' },
  TRADER:      { address: '0xdfBe69c54C7bDCCB00a9CCd9C62057Fe30726726', key: '0xcc1b3726c7072bff26387a67b8a9ac325794d703229170389a1a5220e2a86014' },
  ANALYST:     { address: '0xa4ce28adf053D68491f6BD2730D71fF651531358', key: '0x980816ee0d1c0fa3c2216933068ecd66e918700aade9b47ed128eef4c48c1a5a' },
  VIEWER:      { address: '0x838e9b5c67551Dba88D95BEAb99e79B8D9abcd32', key: '0xf66288e4af6f69d12abcfd7e76660a08809fbf2a4f4052823e55f509b3439abb' },
};

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = http.request({ ...BASE, method, path, headers }, (res) => {
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
  // Small delay to avoid rate limiting
  await new Promise(r => setTimeout(r, 4000));
  
  const ch = await req('POST', '/auth/challenge', { walletAddress: w.address });
  if (ch.status !== 200) throw new Error(`Challenge: ${ch.status}`);
  const msg = JSON.parse(ch.body).data.message;
  
  const sk = new ethers.SigningKey(w.key);
  const sig = sk.sign(ethers.hashMessage(msg)).serialized;
  
  const au = await req('POST', '/auth/authenticate', { walletAddress: w.address, signature: sig });
  if (au.status !== 200) throw new Error(`Auth: ${au.status} ${au.body}`);
  return JSON.parse(au.body).data.token;
}

// Each endpoint: [method, path, body?, expected_per_role]
// expected: 200=allowed, 403=forbidden, 401=unauth, 400=validation
const TESTS = [
  ['GET',  '/health',                                     null,  { ALL: 200 }],
  ['GET',  '/auth/me',                                    null,  { ALL: 200 }],
  ['GET',  '/api/v1/portfolio/summary',                   null,  { ALL: 200 }],
  ['GET',  '/api/v1/portfolio/holdings',                  null,  { ALL: 200 }],
  ['GET',  '/api/v1/notifications',                       null,  { ALL: 200 }],
  ['GET',  '/api/v1/exchanges',                           null,  { ALL: 200 }],
  ['GET',  '/api/v1/trades',                              null,  { ALL: 200 }],
  ['POST', '/api/v1/trades', { exchangeAccountId:'x', symbol:'BTCUSDT', side:'BUY', type:'MARKET', quantity:0.001, idempotencyKey: crypto.randomUUID() }, { SUPER_ADMIN:400, ADMIN:400, TRADER:400, ANALYST:403, VIEWER:403 }],
  ['POST', '/api/v1/risk/metrics', { portfolio:[] },       { SUPER_ADMIN:200, ADMIN:200, TRADER:200, ANALYST:200, VIEWER:403 }],
  ['GET',  '/api/v1/backtest/history',                    null,  { SUPER_ADMIN:200, ADMIN:200, TRADER:403, ANALYST:200, VIEWER:403 }],
  ['GET',  '/api/v1/scoring-rules',                       null,  { SUPER_ADMIN:200, ADMIN:200, TRADER:403, ANALYST:200, VIEWER:403 }],
  ['GET',  '/api/v1/ai/providers',                        null,  { SUPER_ADMIN:200, ADMIN:200, TRADER:403, ANALYST:200, VIEWER:403 }],
  ['GET',  '/api/v1/news/recent',                         null,  { SUPER_ADMIN:200, ADMIN:200, TRADER:403, ANALYST:200, VIEWER:403 }],
  ['GET',  '/api/v1/audit/export',                        null,  { SUPER_ADMIN:200, ADMIN:200, TRADER:403, ANALYST:403, VIEWER:403 }],
];

async function main() {
  console.log('🔐 AQTMS Permission Test\n');
  
  // Get tokens with delays to avoid rate limiting
  const tokens = {};
  for (const role of ['SUPER_ADMIN', 'ADMIN', 'TRADER', 'ANALYST', 'VIEWER']) {
    try {
      tokens[role] = await getToken(role);
      console.log(`  ✅ ${role.padEnd(12)} token obtained`);
    } catch (e) {
      console.log(`  ❌ ${role.padEnd(12)} ${e.message}`);
    }
  }
  
  console.log('\n📊 Running permission tests...\n');
  
  let pass = 0, fail = 0;
  const rows = [];
  
  for (const [method, path, body, expected] of TESTS) {
    const label = `${method.padEnd(4)} ${path}`;
    const row = [label];
    let allPass = true;
    
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'TRADER', 'ANALYST', 'VIEWER']) {
      const token = tokens[role];
      if (!token) { row.push('⏭️'); continue; }
      
      const res = await req(method, path, body, token);
      const exp = expected[role] ?? expected.ALL ?? 200;
      const ok = res.status === exp;
      
      if (ok) {
        row.push(`✅ ${res.status}`);
        pass++;
      } else {
        row.push(`❌ Got ${res.status} want ${exp}`);
        fail++;
        allPass = false;
      }
      // Small delay between requests
      await new Promise(r => setTimeout(r, 500));
    }
    rows.push(row);
  }
  
  // Print table
  const colW = [38, 14, 14, 14, 14, 14];
  const headers = ['Endpoint', 'SUPER_ADMIN', 'ADMIN', 'TRADER', 'ANALYST', 'VIEWER'];
  console.log(headers.map((h,i)=>h.padEnd(colW[i])).join(''));
  console.log('─'.repeat(colW.reduce((a,b)=>a+b,0)));
  for (const r of rows) {
    console.log(r.map((c,i)=>String(c||'').padEnd(colW[i])).join(''));
  }
  
  console.log(`\n📋 ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
