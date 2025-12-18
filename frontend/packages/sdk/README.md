# Universal Private SDK

這是一個基於 Railgun 協議的隱私交易 SDK，支援 EVM 鏈與 Zetachain 之間的跨鏈隱私操作。

## 📦 安裝

```bash
npm install @st99005912/universal-private-sdk ethers
# 或
pnpm add @st99005912/universal-private-sdk ethers
```

## 🚀 快速開始

### 1. 初始化引擎 (Initialize Engine)

在使用任何功能之前，必須先初始化 SDK。

**Web 環境 (React/Next.js):**

```typescript
import { initializeEngine, loadEngineProvider } from "@st99005912/universal-private-sdk";
import { createWebDatabase, createWebArtifactStore } from "@st99005912/universal-private-sdk/web";

const init = async () => {
  await initializeEngine({
    walletSource: "my-dapp",
    db: createWebDatabase("my-db"),
    artifactStore: createWebArtifactStore(),
    shouldDebug: true
  });

  // 連接網路 (例如 Sepolia)
  await loadEngineProvider({
    name: "Sepolia",
    rpcUrl: "https://rpc.ankr.com/eth_sepolia",
    chainId: 11155111
  });
};
```

### 2. 創建/載入錢包 (Wallet)

```typescript
import { createRailgunWallet, loadWalletByID } from "@st99005912/universal-private-sdk";

// 創建新錢包
const createWallet = async (mnemonic: string, password: string) => {
  // 產生加密金鑰 (請妥善保存)
  const encryptionKey = await pbkdf2(password, "salt", 100000); 
  
  const walletInfo = await createRailgunWallet(
    encryptionKey,
    mnemonic,
    { [NetworkName.Sepolia]: 0 } // Creation Block
  );
  return walletInfo.id;
};
```

### 3. 隱私存款 (Shield)

將公開代幣 (ERC20) 轉入隱私餘額。

```typescript
import { erc20PopulateShieldTransaction } from "@st99005912/universal-private-sdk";

const shield = async (walletId: string, tokenAddress: string, amount: bigint, signer: JsonRpcSigner) => {
  const { transaction } = await erc20PopulateShieldTransaction(
    "Sepolia",
    walletId,
    [{ tokenAddress, amount, recipientAddress: "0zk..." }], // 0zk Address
    true // 使用 Public Wallet 簽名
  );

  // 發送交易
  const tx = await signer.sendTransaction(transaction);
  await tx.wait();
};
```

### 4. 隱私轉帳 (Private Transfer)

在隱私池內進行轉帳 (0zk -> 0zk)。

```typescript
import { executeTransfer } from "@st99005912/universal-private-sdk";

const transfer = async (walletId: string, recipient: string, amount: bigint, token: string, key: string, signer: JsonRpcSigner) => {
  const tx = await executeTransfer(
    "Sepolia",
    walletId,
    recipient, // 0zk Address
    amount,
    token,
    key, // Encryption Key
    signer
  );
  console.log("Tx Hash:", tx.hash);
};
```

### 5. 跨鏈隱私轉帳 (Cross-Chain Transfer)

從一條鏈的隱私餘額轉帳到另一條鏈的公開地址。

```typescript
import { executeCrossChainTransferFromEvm } from "@st99005912/universal-private-sdk";

const crossChain = async () => {
  const tx = await executeCrossChainTransferFromEvm(
    "Sepolia",           // 來源鏈
    "0xZetachainAdapt..",// Zetachain Adapt 合約地址
    walletId,
    encryptionKey,
    1000000n,            // 總金額 (含手續費)
    997500n,             // 實際轉帳金額 (扣除 0.25% 手續費)
    "0xToken...",        // Token 地址
    "0xTargetZRC20...",  // 目標鏈 ZRC20 地址
    "0xReceiver...",     // 接收者地址
    signer,
    "0xEVMAdapt..."      // EVM Adapt 合約地址
  );
  
  console.log("Cross-Chain Tx:", tx.hash);
};
```
