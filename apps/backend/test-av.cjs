const ethers = require('ethers');
const http = require('http');
const crypto = require('crypto');

const W = {
  A: { addr: '0xa4ce28adf053D68491f6BD2730D71fF651531358', key: '0x980816ee0d1c0fa3c2216933068ecd66e918700aade9b47ed128eef4c48c1a5a' },
  V: { addr: '0x838e9b5c67551Dba88D95BEAb99e79B8D9abcd32', key: '0xf66288e4af6f69d12abcfd7e76660a08809fbf2a4f4052823e55f509b3439abb' },
};

function fetch(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3001, method, path, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    const r = http.request(opts, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try { resolve({status:res.statusCode, data:JSON.parse(d)}); } catch { resolve({status:res.statusCode, raw:d}); } }); });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function getToken(wallet) {
  const ch = await fetch('POST', '/auth/challenge', { walletAddress: wallet.addr });
  const sk = new ethers.SigningKey(wallet.key);
  const sig = sk.sign(ethers.hashMessage(ch.data.data.message)).serialized;
  const au = await fetch('POST', '/auth/authenticate', { walletAddress: wallet.addr, signature: sig });
  return au.data.data.token;
}

const TESTS = [
  { m:'GET',  p:'/health',                     b:null,  e:{A:200,V:200} },
  { m:'GET',  p:'/auth/me',                    b:null,  e:{A:200,V:200} },
  { m:'GET',  p:'/api/v1/portfolio/summary',   b:null,  e:{A:200,V:200} },
  { m:'GET',  p:'/api/v1/portfolio/holdings',  b:null,  e:{A:200,V:200} },
  { m:'GET',  p:'/api/v1/notifications',       b:null,  e:{A:200,V:200} },
  { m:'GET',  p:'/api/v1/exchanges',           b:null,  e:{A:200,V:200} },
  { m:'GET',  p:'/api/v1/trades',              b:null,  e:{A:200,V:200} },
  { m:'POST', p:'/api/v1/trades',              b:{exchangeAccountId:'x',symbol:'BTCUSDT',side:'BUY',type:'MARKET',quantity:0.001,idempotencyKey: crypto.randomUUID()}, e:{A:403,V:403} },
  { m:'POST', p:'/api/v1/risk/metrics',        b:{portfolio:[]}, e:{A:200,V:403} },
  { m:'GET',  p:'/api/v1/backtest/history',    b:null,  e:{A:200,V:403} },
  { m:'GET',  p:'/api/v1/scoring-rules',       b:null,  e:{A:200,V:403} },
  { m:'GET',  p:'/api/v1/ai/providers',        b:null,  e:{A:200,V:403} },
  { m:'GET',  p:'/api/v1/news/recent',        b:null,  e:{A:200,V:403} },
  { m:'GET',  p:'/api/v1/audit/export',       b:null,  e:{A:403,V:403} },
];

async function test(role, wallet) {
  console.log(`\n═══ ${role} ═══`);
  const token = await getToken(wallet);
  let pass = 0, fail = 0;
  
  for (const t of TESTS) {
    const res = await fetch(t.m, t.p, t.b);
    const exp = t.e[role[0]];
    const ok = res.status === exp;
    console.log(`  ${ok?'✅':'❌'} ${t.m.padEnd(4)} ${t.p.padEnd(38)} → ${res.status}${ok?'':' (want '+exp+')'}`);
    ok ? pass++ : fail++;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`  📊 ${pass}/${pass+fail} passed`);
  return fail === 0;
}

(async()=>{
  const a = await test('ANALYST', W.A);
  process.stdout.write('  ⏳ Waiting for rate limit...');
  await new Promise(r => setTimeout(r, 15000));
  console.log(' done');
  const v = await test('VIEWER', W.V);
  console.log(`\n${a && v ? '✅ ALL PASSED' : '❌ FAILURES'}`);
  process.exit(a && v ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
