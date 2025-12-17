# UniversalPrivate SDK 使用指南

本指南整合了專案實戰經驗，提供從環境設置、初始化到執行隱私交易的完整流程。

## 1. 環境設置 (Prerequisites)

本專案使用 ESM 模組，請務必使用 `tsx` 執行腳本。

### 安裝依賴
確保專案根目錄已安裝依賴：
```bash
pnpm install
```

### 執行工具
在測試或腳本目錄下，統一使用 `tsx`：
```bash
# 範例
npx tsx main.ts
```

---

## 2. 初始化引擎 (Initialization)

在使用任何 SDK 功能前，必須先初始化 Railgun Engine。這包括設置資料庫、下載零知識證明 Artifacts 以及設置 Prover。

### 核心程式碼範例

```typescript
import { initializeEngine } from "@repo/sdk";
import { createNodeDatabase, createNodeArtifactStore } from "@repo/sdk/node";
// 假設您有 setupNodeGroth16 的實作
// import { setupNodeGroth16 } from "./prover"; 

const init = async () => {
  // 1. 初始化 Prover (Groth16) - 依據您的環境實作
  // await setupNodeGroth16();

  // 2. 初始化 Engine
  await initializeEngine({
    walletSource: "my-app",
    dbPath: "./engine.db",        // 加密錢包儲存路徑
    artifactsPath: "./artifacts", // ZK Artifacts 儲存路徑
  });
  
  console.log("Engine initialized!");
};
```

### 常見問題
*   **Engine not initialized**: 確保在呼叫 `getEngine()` 或任何錢包操作前，`initializeEngine` 已完成 await。
*   **Artifacts 下載失敗**: 檢查網路連線，或手動將 Artifacts 放入指定目錄。

---

## 3. 載入網路與錢包 (Network & Wallet)

初始化後，需載入區塊鏈提供者 (Provider) 並建立/載入 Railgun 錢包。

### 載入 Provider
```typescript
import { loadEngineProvider } from "@repo/sdk";
import { NetworkName, FallbackProviderJsonConfig } from "@railgun-community/shared-models";

const loadProvider = async () => {
  const config: FallbackProviderJsonConfig = {
    chainId: 7001, // Zetachain Testnet
    providers: [{
      provider: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
      priority: 1,
      weight: 1,
    }],
    // 關鍵設置：避免 "Invalid fallback provider config" 錯誤
    stallTimeout: 2500,
    maxLogsPerBatch: 10, 
  };

  await loadEngineProvider(NetworkName.ZetaTestnet, config);
};
```

### 建立 Railgun 錢包
```typescript
import { createRailgunWallet } from "@repo/sdk";

const createWallet = async () => {
  const mnemonic = "your mnemonic phrase here...";
  const encryptionKey = "your-secret-encryption-key"; // 用於加密本地資料庫

  const walletInfo = await createRailgunWallet(
    encryptionKey,
    mnemonic,
    undefined // creationBlockNumbers (可選，用於加速同步)
  );

  console.log("Railgun Address:", walletInfo.railgunAddress);
  return walletInfo;
};
```

---

## 4. 核心功能：Shield (存款)

將公開代幣 (ERC20) 轉入隱私合約。在本架構中，這是透過 Sepolia 上的 `EVMAdapt` 合約呼叫 `shieldOnZetachain` 完成的。

### 流程
1.  生成 Shield Request。
2.  簽署 Shield Request。
3.  呼叫合約。

### 程式碼範例
```typescript
import { generateERC20ShieldRequests } from "@repo/sdk";
import { Contract } from "ethers";
import { NetworkName } from "@railgun-community/shared-models";

const executeShield = async (railgunAddress, tokenAddress, amount, signer, evmAdaptAddress) => {
  // 1. 生成 Shield Request
  const shieldRequest = await generateERC20ShieldRequests(
    NetworkName.ZetaTestnet,
    tokenAddress,
    amount,
    railgunAddress
  );

  // 2. 呼叫 EVMAdapt 合約 (位於 Sepolia)
  const EVM_ADAPT_ABI = ["function shieldOnZetachain(tuple[] _shieldRequests) payable"];
  const evmAdapt = new Contract(evmAdaptAddress, EVM_ADAPT_ABI, signer);

  // 3. 發送交易
  const tx = await evmAdapt.shieldOnZetachain(
    shieldRequest.shieldRequests, 
    { value: 0n } // 若需支付跨鏈手續費，在此設置
  );
  await tx.wait();
  console.log("Shield TX Hash:", tx.hash);
};
```

---

## 5. 核心功能：Private Transfer (隱私轉帳)

在隱私池內進行轉帳。這需要生成零知識證明 (ZK Proof)。

### 流程
1.  同步餘額 (確保有足夠的 UTXO)。
2.  生成交易證明與數據。
3.  透過 Relayer 或 Adapt 合約上鏈。

### 程式碼範例
```typescript
import { generateTransferTransaction } from "@repo/sdk";
import { NetworkName } from "@railgun-community/shared-models";
import { Contract } from "ethers";

const executeTransfer = async (
  senderWalletId,
  receiverAddress,
  amount,
  tokenAddress,
  encryptionKey,
  signer,
  evmAdaptAddress
) => {
  // 1. 生成交易數據 (包含 ZK Proof)
  // 注意：這一步驟可能需要幾秒鐘到幾分鐘來生成證明
  const transaction = await generateTransferTransaction(
    NetworkName.ZetaTestnet,
    senderWalletId,
    receiverAddress,
    amount,
    tokenAddress,
    encryptionKey
  );

  // 2. 取得交易 Payload
  const data = transaction.transaction.data;

  // 3. 透過 EVMAdapt 上鏈 (位於 Sepolia)
  const evmAdapt = new Contract(evmAdaptAddress, ["function transactOnZetachain(bytes)"], signer);
  const tx = await evmAdapt.transactOnZetachain(data);
  
  await tx.wait();
  console.log("Private Transfer TX:", tx.hash);
};
```

---

## 6. 故障排除 (Troubleshooting)

### Q: `Error: Invalid fallback provider config`
**解法**: 在 `loadEngineProvider` 的配置中，務必包含 `stallTimeout` 和 `maxLogsPerBatch`。
```typescript
{
  stallTimeout: 2500,
  maxLogsPerBatch: 10
}
```

### Q: `Error: insufficient funds for intrinsic transaction cost`
**解法**: 檢查發送交易的錢包 (Signer) 在 **Sepolia** 網路上是否有足夠的 ETH 支付 Gas。雖然邏輯在 Zetachain，但 `EVMAdapt` 部署在 Sepolia。

### Q: `Error: RAILGUN Engine not yet initialized`
**解法**: 檢查 `main.ts` 或測試腳本的 import 順序。確保在使用 `getEngine()` 之前，`initializeEngine()` 已經被執行並完成。

### Q: `Error: Unknown file extension ".ts"`
**解法**: 不要使用 `node` 或 `ts-node` 直接執行。請使用 `npx tsx <filename>.ts`。
