# 🧪 AQTMS 測試錢包

> ⚠️ 以下全部為本地測試用途，切勿用於主網或存入真實資產。

## 測試錢包列表

| # | Role | Address | Private Key |
|---|---|---|---|
| 1 | 👑 SUPER_ADMIN | `0xa56bF1aF5852Ae66B722D9F89ba8F4e6357199f7` | `0x2a411adf8e54105378f6bff64cb6ac5937f163c0e825281744f9d222aa586add` |
| 2 | 🔧 ADMIN | `0xaF6029C241028B5A1884c0ba26a593795598f159` | `0xc4afe9443b685126032c2ec71176a8f5268172b7b040998152e92890d7e21f66` |
| 3 | 💹 TRADER | `0xdfBe69c54C7bDCCB00a9CCd9C62057Fe30726726` | `0xcc1b3726c7072bff26387a67b8a9ac325794d703229170389a1a5220e2a86014` |
| 4 | 📊 ANALYST | `0xa4ce28adf053D68491f6BD2730D71fF651531358` | `0x980816ee0d1c0fa3c2216933068ecd66e918700aade9b47ed128eef4c48c1a5a` |
| 5 | 👀 VIEWER | `0x838e9b5c67551Dba88D95BEAb99e79B8D9abcd32` | `0xf66288e4af6f69d12abcfd7e76660a08809fbf2a4f4052823e55f509b3439abb` |

## Role Permissions 對照

| Permission | SUPER_ADMIN | ADMIN | TRADER | ANALYST | VIEWER |
|---|---|---|---|---|---|
| `trade:execute` | ✅ | ✅ | ✅ | | |
| `trade:cancel` | ✅ | ✅ | ✅ | | |
| `trade:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `exchange:connect` | ✅ | ✅ | ✅ | | |
| `exchange:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `risk:view` | ✅ | ✅ | ✅ | ✅ | |
| `risk:manage` | ✅ | | | | |
| `scoring:manage` | ✅ | ✅ | | ✅ | |
| `ai:read` | ✅ | ✅ | | ✅ | |
| `datasource:read` | ✅ | ✅ | ✅ | ✅ | |
| `audit:read` | ✅ | ✅ | | ✅ | |
| `audit:export` | ✅ | ✅ | | | |
| `admin:user:manage` | ✅ | ✅ | | | |
| `admin:system` | ✅ | ✅ | | | |
| `user:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `backtest:run` | ✅ | ✅ | | ✅ | |

## Page Access 對照

| Page | SUPER_ADMIN | ADMIN | TRADER | ANALYST | VIEWER |
|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Exchanges | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trades | ✅ | ✅ | ✅ | ✅ | ✅ |
| Portfolio | ✅ | ✅ | ✅ | ✅ | ✅ |
| Risk | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI Signals | ✅ | ✅ | ❌ | ✅ | ❌ |
| Backtest | ✅ | ✅ | ❌ | ✅ | ❌ |
| Scoring Rules | ✅ | ✅ | ❌ | ✅ | ❌ |
| Admin Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Admin Audit | ✅ | ✅ | ❌ | ❌ | ❌ |
| Admin System | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 🧪 測試步驟

### 前置條件

```bash
# 1. 確保服務運行中
mysql  :3306  ✅
redis  :6379  ✅
backend:3001  ✅
frontend:5173 ✅

# 2. Seed 測試用戶到 DB
cd apps/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const PERMS = {
  SUPER_ADMIN: ['trade:execute','trade:cancel','trade:read','exchange:connect','exchange:read','risk:view','risk:manage','scoring:manage','ai:read','datasource:read','audit:read','audit:export','admin:user:manage','admin:system','user:read','backtest:run'],
  ADMIN: ['trade:execute','trade:cancel','trade:read','exchange:connect','exchange:read','risk:view','user:read','audit:read','audit:export','ai:read','datasource:read','admin:user:manage','admin:system','backtest:run','scoring:manage'],
  TRADER: ['trade:execute','trade:cancel','trade:read','exchange:connect','exchange:read','risk:view','datasource:read','user:read'],
  ANALYST: ['trade:read','exchange:read','ai:read','datasource:read','audit:read','risk:view','scoring:manage','backtest:run','user:read'],
  VIEWER: ['trade:read','exchange:read','user:read'],
};

const USERS = [
  { role:'SUPER_ADMIN', addr:'0xa56bF1aF5852Ae66B722D9F89ba8F4e6357199f7' },
  { role:'ADMIN',       addr:'0xaF6029C241028B5A1884c0ba26a593795598f159' },
  { role:'TRADER',      addr:'0xdfBe69c54C7bDCCB00a9CCd9C62057Fe30726726' },
  { role:'ANALYST',     addr:'0xa4ce28adf053D68491f6BD2730D71fF651531358' },
  { role:'VIEWER',      addr:'0x838e9b5c67551Dba88D95BEAb99e79B8D9abcd32' },
];

async function seed() {
  for (const u of USERS) {
    const nonce = crypto.randomBytes(32).toString('hex');
    await prisma.user.upsert({
      where: { walletAddress: u.addr },
      create: { walletAddress:u.addr, nonce, role:u.role, permissions:JSON.stringify(PERMS[u.role]) },
      update: { role:u.role, permissions:JSON.stringify(PERMS[u.role]), nonce },
    });
  }
  console.log('✅ 5 test users seeded');
  await prisma.\$disconnect();
}
seed();
"
```

### 自動化 API 測試

```bash
cd apps/backend
node test-full.cjs    # 完整 5 role × 14 endpoint 測試
```

### 手動 Browser 測試

1. 打開 `http://localhost:5173`
2. 用 Brave Browser 打開 Developer Tools → Console
3. 貼上以下 script 模擬 MetaMask：

```javascript
// 模擬 wallet connect — 換成對應 role 嘅 private key
const TEST_KEY = '0x2a411adf8e54105378f6bff64cb6ac5937f163c0e825281744f9d222aa586add'; // SUPER_ADMIN

// Inject mock ethereum provider
const { ethers } = await import('https://cdn.jsdelivr.net/npm/ethers@6.13.5/dist/ethers.min.js');
const wallet = new ethers.Wallet(TEST_KEY);

window.ethereum = {
  request: async ({ method, params }) => {
    if (method === 'eth_requestAccounts') return [wallet.address];
    if (method === 'personal_sign') return wallet.signMessageSync(params[0]);
    throw new Error(`Unsupported method: ${method}`);
  },
  on: () => {},
  removeListener: () => {},
  isMetaMask: true,
};
console.log('✅ Mock wallet injected:', wallet.address);
```

4. Click "Connect Wallet" button on login page
5. Verify role label in header matches
6. Navigate each page, verify access matches 權限表

### 預期結果

- **SUPER_ADMIN**: 全部 13 頁可訪問
- **ADMIN**: 全部 13 頁可訪問（除 risk:manage）
- **TRADER**: 9 頁可訪問（冇 AI Signals, Backtest, Scoring Rules, Admin）
- **ANALYST**: 10 頁可訪問（冇 Admin pages）
- **VIEWER**: 7 頁可訪問（冇 Risk, AI Signals, Backtest, Scoring Rules, Admin）

### 測試結果

✅ **70/70 API permission tests passed** (2026-05-04)
