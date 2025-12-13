# Zetachain Railgun Test

## Installation

```bash
npm install
```

The `postinstall` script will automatically apply patches to add ZetachainTestnet support.

## Scripts Overview

This test suite demonstrates the complete privacy flow using Railgun on ZetaChain with cross-chain capabilities:

### 1. `main.ts` - Initialize & Monitor Balances
**Purpose**: Initialize Railgun engine and continuously monitor private balances

**What it does**:
- Initialize Railgun Engine with database and artifacts
- Configure ZetaChain network and contract addresses
- Create/load Railgun wallet
- Scan Merkle tree and display spendable private balances
- Run in watch mode to continuously monitor balance changes

**Note**: This script runs in the background and automatically updates when new transactions occur. It does NOT perform any transactions itself.

### 2. `shield.ts` - Deposit & Shield
**Purpose**: Deposit tokens from Sepolia and shield them into Railgun privacy pool on ZetaChain

**What it does**:
- Calls `EVMAdapt.shieldOnZetachain()` on Sepolia
- Sends ZRC20 tokens via ZetaChain Gateway
- Creates private commitments in Railgun on ZetaChain

**Flow**: `Sepolia (EVMAdapt)` → `ZetaChain Gateway` → `ZetaChain (Railgun shield)`

### 3. `privateTransfer.ts` - Private Transfer
**Purpose**: Transfer tokens privately between Railgun addresses on ZetaChain

**What it does**:
- Generate ZKP for private transfer using Railgun circuit
- Consume existing commitments (nullifiers) and create new commitments
- Transfer tokens privately without revealing sender, recipient, or amount
- All operations happen on-chain on ZetaChain with zero-knowledge proofs

**Flow**: `Railgun Wallet A` → `ZK Proof Generation` → `ZetaChain (RailgunSmartWallet)` → `Railgun Wallet B`

### 4. `unshield.ts` - Unshield & Withdraw
**Purpose**: Unshield tokens from Railgun and withdraw to Base Sepolia

**What it does**:
- Generate ZKP for unshielding on ZetaChain
- Construct cross-contract calls to transfer ZRC20 and trigger withdrawal
- Call `EVMAdapt.unshieldOutsideChain()` on Sepolia to initiate cross-chain withdrawal
- Withdraw tokens to Base Sepolia (determined by `TARGET_ZRC20_ADDRESS`)

**Flow**: `Sepolia (trigger)` → `ZetaChain (unshield + withdraw)` → `Base Sepolia (receive)`

## Execution Order

```bash
# Terminal 1: Start balance monitoring (runs continuously, updates every 1 minute)
npx tsx main.ts
```

Keep this running to monitor your private balances in real-time. Then in **separate terminals**:

```bash
# Terminal 2: Deposit tokens into privacy pool
npx tsx shield.ts
```

**Before running privateTransfer or unshield:**
1. ⚠️ **STOP `main.ts`** in Terminal 1 (press `Ctrl+C`)
2. Then run the operation:

```bash
# Terminal 3: Private transfer (after stopping main.ts)
npx tsx privateTransfer.ts
```

```bash
# Terminal 4: Withdraw tokens (after stopping main.ts)
npx tsx unshield.ts
```

**Important:**
- ✅ `shield.ts` can run alongside `main.ts`
- ⚠️ `privateTransfer.ts` and `unshield.ts` **MUST NOT** run while `main.ts` is running

## Configuration

Set up your environment variables in `.env`:

```env
PRIVATE_KEY=0x_your_private_key_here
MNEMONIC=your twelve word mnemonic phrase here for railgun wallet
```

**Notes:**
- `PRIVATE_KEY` - Your Ethereum private key (for public wallet transactions on Sepolia/Base)
- `MNEMONIC` - 12-word mnemonic for your Railgun private wallet (generates private Railgun address)

## Troubleshooting

### Issue 1: Nested Dependencies Not Patched

**Symptoms**: Missing ZetachainTestnet support in `@railgun-community/wallet` or `shared-models`

**Solution**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Manually apply patches: `npx patch-package`

**Note**: If `@railgun-community/wallet` has a nested `shared-models` dependency that's missing ZetachainTestnet, you may need to manually patch it after installation.

### Issue 2: Spendable Private Balance Too Low

**Symptoms**:
```
Error: RAILGUN spendable private balance too low for 0x05ba...18b0.
Amount required: 8000000000000000. Balance: 0.
```

**Cause**: Stale or corrupted local Railgun database (`engine.db`) with outdated balance state

**Solution**: Delete `engine.db` and re-sync

```bash
rm engine.db
npx tsx main.ts  # Re-scan and rebuild database
```