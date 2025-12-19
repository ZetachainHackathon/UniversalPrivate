# Universal Private SDK

[![npm version](https://img.shields.io/npm/v/@st99005912/universal-private-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@st99005912/universal-private-sdk)
[![License](https://img.shields.io/npm/l/@st99005912/universal-private-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@st99005912/universal-private-sdk)
[![Downloads](https://img.shields.io/npm/dm/@st99005912/universal-private-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@st99005912/universal-private-sdk)

A professional SDK for privacy-preserving interactions and blockchain integration.

> **Note**: This package is available on the public npm registry and supports standard installation methods.

## 📦 Installation

### Option 1: Install from NPM Registry (Recommended)
This is the standard way to install the package. It ensures you get the latest updates and dependency resolution.

```bash
# using npm
npm install @st99005912/universal-private-sdk

# using yarn
yarn add @st99005912/universal-private-sdk

# using pnpm
pnpm add @st99005912/universal-private-sdk

```

View the package on npm: [https://www.npmjs.com/package/@st99005912/universal-private-sdk](https://www.npmjs.com/package/@st99005912/universal-private-sdk)

---

### Option 2: Manual Installation via Tarball

If you need to install the package offline or strictly control the version artifact, you can use the `.tgz` file directly.

1. Download the release file: `st99005912-universal-private-sdk-0.0.2.tgz`
2. Run the installation command pointing to the file path:

```bash
npm install ./st99005912-universal-private-sdk-0.0.2.tgz

```

## 🚀 Getting Started

### 1. Initialize Engine

You must initialize the SDK before using any features.

**Web Environment (React/Next.js):**

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

  // Connect to a network (e.g., Sepolia)
  await loadEngineProvider({
    name: "Sepolia",
    rpcUrl: "https://rpc.ankr.com/eth_sepolia",
    chainId: 11155111
  });
};

```

### 2. Create/Load Wallet

```typescript
import { createRailgunWallet, loadWalletByID } from "@st99005912/universal-private-sdk";

// Create a new wallet
const createWallet = async (mnemonic: string, password: string) => {
  // Generate encryption key (store this safely)
  const encryptionKey = await pbkdf2(password, "salt", 100000); 
   
  const walletInfo = await createRailgunWallet(
    encryptionKey,
    mnemonic,
    { [NetworkName.Sepolia]: 0 } // Creation Block
  );
  return walletInfo.id;
};

```

### 3. Shield (Deposit to Privacy)

Transfer public tokens (ERC20) into a private balance.

```typescript
import { erc20PopulateShieldTransaction } from "@st99005912/universal-private-sdk";

const shield = async (walletId: string, tokenAddress: string, amount: bigint, signer: JsonRpcSigner) => {
  const { transaction } = await erc20PopulateShieldTransaction(
    "Sepolia",
    walletId,
    [{ tokenAddress, amount, recipientAddress: "0zk..." }], // 0zk Address
    true // Sign with Public Wallet
  );

  // Send transaction
  const tx = await signer.sendTransaction(transaction);
  await tx.wait();
};

```

### 4. Private Transfer

Transfer funds within the privacy pool (0zk -> 0zk).

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

### 5. Cross-Chain Private Transfer

Transfer funds from a private balance on one chain to a public address on another chain.

```typescript
import { executeCrossChainTransferFromEvm } from "@st99005912/universal-private-sdk";

const crossChain = async () => {
  const tx = await executeCrossChainTransferFromEvm(
    "Sepolia",             // Source chain
    "0xZetachainAdapt..",  // Zetachain Adapt contract address
    walletId,
    encryptionKey,
    1000000n,              // Total amount (including fees)
    997500n,               // Actual transfer amount (deducting 0.25% fee)
    "0xToken...",          // Token address
    "0xTargetZRC20...",    // Target chain ZRC20 address
    "0xReceiver...",       // Receiver address
    signer,
    "0xEVMAdapt..."        // EVM Adapt contract address
  );
   
  console.log("Cross-Chain Tx:", tx.hash);
};

```

## 🛠 Requirements

* **Node.js**: >= 16.0.0
* **npm**: >= 7.0.0

## 📄 License

This project is licensed under the MIT License.
