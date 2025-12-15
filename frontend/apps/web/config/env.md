# 環境配置說明 - env.ts

本文檔詳細說明 `config/env.ts` 中的環境配置結構及其在專案中的使用情況。

## 檔案概述

`env.ts` 檔案定義了 Railgun Web 應用程式的所有環境配置，使用 TypeScript 的 `as const` 斷言確保型別安全和不可變性。

## 配置結構

### CONFIG 物件結構

```typescript
export const CONFIG = {
    RAILGUN_NETWORK: { ... },
    CONTRACTS: { ... },
    TOKENS: { ... },
    CHAINS: { ... },
    FEES: { ... },
    GAS: { ... }
} as const;
```

### RAILGUN_NETWORK
定義 Railgun 引擎的主要網路設定

| 屬性 | 類型 | 說明 |
|------|------|------|
| `NAME` | `NetworkName` | 網路名稱，使用 `@railgun-community/shared-models` 中的列舉 |
| `RPC_URL` | `string` | ZetaChain Testnet 的 RPC 端點 |
| `CHAIN_ID` | `number` | 鏈 ID 號碼 |

**當前設定：**
- 網路：ZetaChain Testnet
- RPC URL：`https://zetachain-athens-evm.blockpi.network/v1/rpc/public`
- 鏈 ID：7001

### CONTRACTS
儲存重要合約地址

| 屬性 | 類型 | 說明 |
|------|------|------|
| `TEST_ERC20` | `string` | 測試用 ERC20 代幣合約地址 |

**當前設定：**
- TEST_ERC20：`0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0`

### TOKENS
定義支援的代幣清單，每個代幣包含地址、小數位數和 Logo URL

#### 代幣配置結構
```typescript
TOKENS: {
    [TokenSymbol]: {
        address: string;      // 代幣合約地址
        decimals: number;     // 小數位數
        logoUrl: string;      // Trust Wallet Assets Logo URL
    }
}
```

#### 代幣分類

**原生代幣：**
- `WZETA` - ZetaChain 上的包裹 ZETA 代幣 (18 decimals)

**ETH 代幣（來自不同鏈的 ZRC-20 表示）：**
- `ETH_SEPOLIA` - Sepolia 測試網上的 ETH (18 decimals)
- `ETH_BASE_SEPOLIA` - Base Sepolia 網路上的 ETH (18 decimals)
- `ETH_ARBITRUM_SEPOLIA` - Arbitrum Sepolia 測試網上的 ETH (18 decimals)

**穩定幣（來自 Sepolia）：**
- `USDC_SEPOLIA` - USDC (6 decimals)
- `USDCT_SEPOLIA` - USDCT (6 decimals)
- `USDTT_SEPOLIA` - USDTT (6 decimals)

**穩定幣（來自 Base Sepolia）：**
- `USDC_BASE_SEPOLIA` - USDC (6 decimals)
- `USDCT_BASE_SEPOLIA` - USDCT (6 decimals)
- `USDTT_BASE_SEPOLIA` - USDTT (6 decimals)

**Gas 代幣（來自不同鏈的 ZRC-20 表示）：**
- `BNB_BSC` - BSC 網路上的 BNB (18 decimals)
- `AVAX_FUJI` - Avalanche Fuji 測試網上的 AVAX (18 decimals)
- `POL_AMOY` - Polygon Amoy 測試網上的 POL (18 decimals)
- `KAIA_KAIROS` - Kaia Kairos 測試網上的 KAIA (18 decimals)
- `BTC_SIGNET` - Bitcoin Signet 上的 BTC (8 decimals)
- `BTC_TESTNET4` - Bitcoin Testnet4 上的 BTC (8 decimals)
- `SUI_SUI` - Sui 網路上的 SUI (9 decimals)
- `SOL_SOLANA` - Solana 網路上的 SOL (9 decimals)
- `TON_TON` - TON 網路上的 TON (9 decimals)

**注意：**
- 所有代幣都包含 `logoUrl` 字段，使用 Trust Wallet Assets 的 URL 格式
- 這些是 ZRC-20 代幣，代表不同鏈上的原生代幣在 ZetaChain 上的表示
- 來源：https://www.zetachain.com/docs/developers/evm/zrc20

### CHAINS
多鏈支援的鏈配置，每個鏈包含多個屬性

#### 鏈配置結構
```typescript
CHAINS: {
    [ChainName]: {
        ID_DEC: number;           // 十進位鏈 ID
        ID_HEX: string;           // 十六進位鏈 ID
        EVM_ADAPT?: string;       // EVM Adapt 合約地址（跨鏈操作用）
        ZETACHAIN_ADAPT?: string; // ZetaChain Adapt 合約地址
        ZRC20_GAS?: string;       // ZRC20 Gas 代幣地址
        CHAIN_LOGO: string;       // Trust Wallet Assets Logo URL
    }
}
```

#### 支援的鏈

| 鏈名稱 | 十進位 ID | 十六進位 ID | EVM_ADAPT | ZETACHAIN_ADAPT | 說明 |
|--------|-----------|-------------|-----------|-----------------|------|
| `SEPOLIA` | 11155111 | `0xaa36a7` | `0x7bE4f15d073611A13A9C3C123500Ae445F546246` | - | Ethereum Sepolia 測試網 |
| `ZETACHAIN` | 7001 | `0x1b59` | - | `0x82b09E123d47618bbdCd08ECACB82fB6Da2118A1` | ZetaChain Testnet |
| `BASE_SEPOLIA` | 84532 | `0x14a34` | `0xa47677E3c066281D6f259B92552fAD50076D16d0` | - | Base Sepolia 測試網 |
| `ARBITRUM_SEPOLIA` | 421614 | `0x66eee` | `0x806bF9E4A9fF5Da69540760831aF2e5360a80351` | - | Arbitrum Sepolia 測試網 |
| `BSC_TESTNET` | 97 | `0x61` | `0x806bF9E4A9fF5Da69540760831aF2e5360a80351` | - | BSC 測試網 |
| `KAIA_TESTNET` | 1001 | `0x3e9` | `0x806bF9E4A9fF5Da69540760831aF2e5360a80351` | - | Kaia (Klaytn) 測試網 |
| `AVALANCHE_TEST` | 43113 | `0xa869` | `0x806bF9E4A9fF5Da69540760831aF2e5360a80351` | - | Avalanche Fuji 測試網 |
| `POLYGON_AMOY` | 80002 | `0x13882` | `0xc4660f40BA6Fe89b3BA7Ded44Cf1DB73D731c95e` | - | Polygon Amoy 測試網 |

**注意：**
- 所有鏈都包含 `CHAIN_LOGO` 字段，使用 Trust Wallet Assets 的 URL 格式
- `EVM_ADAPT` 用於從 EVM 鏈發起跨鏈轉帳
- `ZETACHAIN_ADAPT` 僅在 ZetaChain 上使用
- `ZRC20_GAS` 是該鏈在 ZetaChain 上的 ZRC-20 Gas 代幣地址

### FEES
費用相關配置

| 屬性 | 類型 | 說明 |
|------|------|------|
| `UNSHIELD_BASIS_POINTS` | `bigint` | 取消隱私保護時的基礎點數費用 |

**當前設定：**
- UNSHIELD_BASIS_POINTS：25n（相當於 0.25%）

### GAS
Gas 限制配置

| 屬性 | 類型 | 說明 |
|------|------|------|
| `MIN_LIMIT_CROSS_CHAIN` | `bigint` | 跨鏈操作的最小 Gas 限制 |

**當前設定：**
- MIN_LIMIT_CROSS_CHAIN：1,000,000n

## 使用檔案統計

總共 **16 個檔案** 引用了此配置：

### 核心函式庫 (lib/railgun/)
1. **`token-utils.ts`** - 代幣工具函數，使用 `CONFIG.TOKENS`（包含 logoUrl），提供 `getTokenLogoUrl` 函數
2. **`transfer.ts`** - 轉帳邏輯，使用 `CONFIG.CHAINS`
3. **`wallet-actions.ts`** - 錢包動作，使用 `CONFIG.RAILGUN_NETWORK`
4. **`wallet.ts`** - 錢包管理，使用 `CONFIG.RAILGUN_NETWORK`
5. **`balance.ts`** - 餘額查詢，使用 `CONFIG.RAILGUN_NETWORK`
6. **`cross-chain-transfer.ts`** - 跨鏈轉帳，使用 `CONFIG.CHAINS`、`CONFIG.FEES`、`CONFIG.GAS`
7. **`cross-chain-shield.ts`** - 跨鏈隱私保護，使用 `CONFIG.CONTRACTS`
8. **`cross-chain-check.test.ts`** - 測試檔案，使用 `CONFIG.FEES`、`CONFIG.CHAINS`
9. **`config.test.ts`** - 配置測試，使用 `CONFIG.CHAINS`

### React Hooks (hooks/)
1. **`use-transfer-tx.ts`** - 轉帳交易 Hook，使用 `CONFIG.CHAINS`
2. **`use-network-guard.ts`** - 網路守衛 Hook，使用 `CONFIG.CHAINS`
3. **`use-network-sync.ts`** - 網路同步 Hook，使用 `CONFIG.CHAINS`
4. **`use-shield-tx.ts`** - 隱私保護交易 Hook，使用 `CONFIG`

### React 組件 (components/)
1. **`cross-chain/transfer-form.tsx`** - 跨鏈轉帳表單組件，使用 `CONFIG`（包含 TOKENS、CHAINS、logoUrl、CHAIN_LOGO）
2. **`cross-chain/shield-form.tsx`** - 隱私保護表單組件，使用 `CONFIG.CONTRACTS`、`CONFIG.CHAINS`（包含 CHAIN_LOGO）
3. **`cross-chain/header.tsx`** - 頁面標頭組件，使用 `CONFIG.CHAINS`（包含 CHAIN_LOGO）進行網路切換

### 頁面組件 (app/)
1. **`cross-chain/page.tsx`** - 跨鏈頁面，使用 `CONFIG.CHAINS`

## 使用模式分析

### 網路管理
- `CONFIG.RAILGUN_NETWORK` 用於初始化 Railgun 引擎
- `CONFIG.CHAINS` 用於網路切換和驗證

### 代幣支援
- `CONFIG.TOKENS` 提供支援代幣的地址、decimals 和 logoUrl
- `CONFIG.CONTRACTS` 提供測試合約地址
- 所有代幣 Logo 使用 Trust Wallet Assets 的 URL

### 跨鏈操作
- `CONFIG.CHAINS` 提供各鏈的適配器地址、ZRC20_GAS 和 CHAIN_LOGO
- `CONFIG.FEES` 定義手續費率
- `CONFIG.GAS` 設定 Gas 限制
- 所有鏈 Logo 使用 Trust Wallet Assets 的 URL

## 修改指南

### 新增支援鏈
1. 在 `CHAINS` 物件中新增鏈配置
2. 包含必要的地址欄位（EVM_ADAPT 或 ZETACHAIN_ADAPT）
3. 添加 `CHAIN_LOGO` 字段（使用 Trust Wallet Assets URL）
4. 添加 `ZRC20_GAS` 字段（該鏈在 ZetaChain 上的 ZRC-20 Gas 代幣地址）
5. 更新相關的 Hook 和組件邏輯

### 新增代幣
1. 在 `TOKENS` 物件中新增代幣配置
2. 提供合約地址、decimals 和 logoUrl
3. 確保地址格式正確（checksum）
4. Logo URL 使用 Trust Wallet Assets 格式：
   ```
   https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/{blockchain}/assets/{address}/logo.png
   ```

### 修改費用
- `UNSHIELD_BASIS_POINTS` 以基礎點為單位（1 = 0.01%）

### 注意事項
- 所有地址應使用 checksum 格式
- 鏈 ID 必須與實際網路匹配
- 修改前請確保所有相依的合約地址都正確
- Gas 限制應根據實際網路條件調整
- Logo URL 使用 Trust Wallet Assets 的公開 CDN，確保 URL 格式正確
- 新增代幣時，需要確認該代幣在 Trust Wallet Assets 中有對應的 Logo

## 測試覆蓋

配置通過以下測試檔案驗證：
- `config.test.ts` - 基礎配置驗證
- `cross-chain-check.test.ts` - 跨鏈邏輯測試

---

*最後更新：基於程式碼分析自動生成*
