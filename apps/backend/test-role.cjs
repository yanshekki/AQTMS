// Quick per-role test — run with: node test-role.cjs ROLE_NAME
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
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = http.request({ hostname:'localhost',port:3001,method,path,headers }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    r.on('error', e => resolve({ status: 0, error: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  const targetRole = process.argv[2];
  if (!targetRole || !WALLETS[targetRole]) {
    console.log('Usage: node test-role.cjs <ROLE>');
    console.log('Roles: SUPER_ADMIN, ADMIN, TRADER, ANALYST, VIEWER');
    process.exit(1);
  }
  
  const w = WALLETS[targetRole];
  
  // Auth
  const ch = await req('POST', '/auth/challenge', { walletAddress: w.address });
  const msg = JSON.parse(await getBody(ch)).data.message;
  const sk = new ethers.SigningKey(w.key);
  const sig = sk.sign(ethers.hashMessage(msg)).serialized;
  const au = await req('POST', '/auth/authenticate', { walletAddress: w.address, signature: sig });
  const token = JSON.parse(await getBody(au)).data.token;
  
  console.log(`Role: ${targetRole}`);
  
  const TESTS = [
    ['GET',  '/health',                                     null,  200],
    ['GET',  '/auth/me',                                    null,  200],
    ['GET',  '/api/v1/portfolio/summary',                   null,  200],
    ['GET',  '/api/v1/portfolio/holdings',                  null,  200],
    ['GET',  '/api/v1/notifications',                       null,  200],
    ['GET',  '/api/v1/exchanges',                           null,  200],
    ['GET',  '/api/v1/trades',                              null,  200],
    ['POST', '/api/v1/trades', { exchangeAccountId:'x', symbol:'BTCUSDT', side:'BUY', type:'MARKET', quantity:0.001, idempotencyKey: crypto.randomUUID() }, targetRole === 'ANALYST' || targetRole === 'VIEWER' ? 403 : 400],
    ['POST', '/api/v1/risk/metrics', { portfolio:[] },      targetRole === 'VIEWER' ? 403 : 200],
    ['GET',  '/api/v1/backtest/history',                    targetRole === 'TRADER' || targetRole === 'VIEWER' ? 403 : 200],
    ['GET',  '/api/v1/scoring-rules',                       targetRole === 'TRADER' || targetRole === 'VIEWER' ? 403 : 200],
    ['GET',  '/api/v1/ai/providers',                        targetRole === 'TRADER' || targetRole === 'VIEWER' ? 403 : 200],
    ['GET',  '/api/v1/news/recent',                         targetRole === 'TRADER' || targetRole === 'VIEWER' ? 403 : 200],
    ['GET',  '/api/v1/audit/export',                        targetRole === 'ADMIN' || targetRole === 'SUPER_ADMIN' ? 200 : 403],
  ];
  
  let pass = 0, fail = 0;
  for (const [method, path, body, expected] of TESTS) {
    const res = await req(method, path, body, token);
    const ok = res.status === expected;
    const icon = ok ? '✅' : '❌';
    const extra = ok ? '' : ` (expected ${expected})`;
    console.log(`  ${icon} ${method.padEnd(4)} ${path.padEnd(38)} → ${res.status}${extra}`);
    if (ok) pass++; else fail++;
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\n  ${pass}/${pass+fail} passed`);
  if (fail > 0) process.exit(1);
}

async function getBody(res) {
  let d = ''; 
  res.on('data', c => d += c);
  return new Promise(r => res.on('end', () => r(d)));
}

main().catch(e => { console.error(e); process.exit(1); });
