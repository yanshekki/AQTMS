# 🔐 AQTMS 測試錢包 — Private Keys
# ⚠️ 僅供本地測試，切勿用於主網或提交至 Git

## SUPER_ADMIN (👑 全部權限)
Address:     0xa56bF1aF5852Ae66B722D9F89ba8F4e6357199f7
Private Key: 0x2a411adf8e54105378f6bff64cb6ac5937f163c0e825281744f9d222aa586add
Permissions: trade:execute, trade:cancel, trade:read, exchange:connect, exchange:read,
             risk:view, risk:manage, scoring:manage, ai:read, datasource:read,
             audit:read, audit:export, admin:user:manage, admin:system,
             user:read, backtest:run (16 個)

## ADMIN (🔧 管理權限)
Address:     0xaF6029C241028B5A1884c0ba26a593795598f159
Private Key: 0xc4afe9443b685126032c2ec71176a8f5268172b7b040998152e92890d7e21f66
Permissions: trade:execute, trade:cancel, trade:read, exchange:connect, exchange:read,
             risk:view, user:read, audit:read, audit:export, ai:read,
             datasource:read, admin:user:manage, admin:system,
             backtest:run, scoring:manage (15 個，冇 risk:manage)

## TRADER (💹 交易權限)
Address:     0xdfBe69c54C7bDCCB00a9CCd9C62057Fe30726726
Private Key: 0xcc1b3726c7072bff26387a67b8a9ac325794d703229170389a1a5220e2a86014
Permissions: trade:execute, trade:cancel, trade:read, exchange:connect, exchange:read,
             risk:view, datasource:read, user:read (8 個)

## ANALYST (📊 分析權限)
Address:     0xa4ce28adf053D68491f6BD2730D71fF651531358
Private Key: 0x980816ee0d1c0fa3c2216933068ecd66e918700aade9b47ed128eef4c48c1a5a
Permissions: trade:read, exchange:read, ai:read, datasource:read, audit:read,
             risk:view, scoring:manage, backtest:run, user:read (9 個)

## VIEWER (👀 唯讀權限)
Address:     0x838e9b5c67551Dba88D95BEAb99e79B8D9abcd32
Private Key: 0xf66288e4af6f69d12abcfd7e76660a08809fbf2a4f4052823e55f509b3439abb
Permissions: trade:read, exchange:read, user:read (3 個)
