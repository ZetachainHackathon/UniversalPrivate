# RAILGUN Contracts

## Getting started

- Install Node.js - using [nvm](https://github.com/nvm-sh/nvm) is recommended
- Run `npm i` to install dependencies
- (Optional) Setup hardhat local network config in `~/.hardhat/networks.{js|ts|json}` following the [hardhat-local-networks-config-plugin](https://github.com/facuspagnuolo/hardhat-local-networks-config-plugin) format.
- (Optional) Install `hardhat-shorthand` to use `hh` commands.
- Run `hh help` or `npx hardhat help` for list of commands


### System Architecture

This section details the internal architecture of the Railgun Privacy System on ZetaChain, verified against the actual smart contract codebase.

#### 1. High-Level System Architecture

Railgun on ZetaChain orchestrates privacy through a layered approach: **Adapt Layer** (Cross-Chain), **Executor Layer** (RelayAdapt), and **Core Privacy Layer** (Smart Wallet).

```mermaid
graph TD
    User((User))
    
    subgraph "Adapt Layer (Cross-Chain)"
        EVMAdapt["EVMAdapt (Remote Chain)"]
        ZRC20[ZRC-20 Token]
        ZetaAdapt[ZetachainAdapt]
        
        EVMAdapt -.->|Cross-Chain Message| ZetaAdapt
        ZetaAdapt -->|Approve/Call| ZRC20
    end

    subgraph "Executor Layer"
        RelayAdapt[RelayAdapt]
        DeFi[Uniswap/Sushi]
        
        ZetaAdapt -->|Delegate Call| RelayAdapt
        RelayAdapt -->|Multicall| DeFi
    end

    subgraph "Core Privacy Layer"
        Proxy[RailgunProxy]
        Logic[RailgunLogic]
        Verifier[Verifier]
        
        RelayAdapt -->|Shield/Transact| Proxy
        Proxy -->|DelegateCall| Logic
        Logic -->|Verify Proof| Verifier
    end
    
    User -->|Direct Interaction| Proxy
```

#### 2. Modular Core Logic

The `RailgunSmartWallet` is the tip of an inheritance iceberg. It combines token handling, governance, and cryptographic verification.

```mermaid
classDiagram
    class OwnableUpgradeable {
        +transferOwnership(newOwner)
        +owner()
    }
    class TokenBlocklist {
        +mapping tokenBlocklist
    }
    class Commitments {
        +mapping merkleRoots
        +mapping nullifiers
        +insertLeaves()
    }
    class Verifier {
        +verify(transaction)
    }
    class RailgunLogic {
        +uint120 shieldFee
        +uint120 unshieldFee
        +validateTransaction()
        +accumulateAndNullifyTransaction()
    }
    class RailgunSmartWallet {
        +shield(ShieldRequest)
        +transact(Transaction)
    }

    RailgunLogic --|> OwnableUpgradeable
    RailgunLogic --|> TokenBlocklist
    RailgunLogic --|> Commitments
    RailgunLogic --|> Verifier
    RailgunSmartWallet --|> RailgunLogic
```

#### 3. Proxy Storage & Upgrade Pattern

The system uses a **PausableUpgradableProxy**. State is strictly separated from Logic using EIP-1967 storage slots to ensure upgrade safety without data incompatibility.

```mermaid
graph TD
    subgraph "PausableUpgradableProxy"
        Storage[Storage Variables]
        Fallback[fallback()]
    end

    subgraph "EIP-1967 Storage Slots"
        impl[IMPLEMENTATION_SLOT\n(0x360894...)]
        admin[ADMIN_SLOT\n(0xb53127...)]
        paused[PAUSED_SLOT\n(0x8b9e6f...)]
    end
    
    subgraph "Logic Contracts"
        V1[RailgunSmartWallet V1]
        V2[RailgunSmartWallet V2]
    end

    Fallback --"DELEGATECALL"--> V1
    Fallback -.-> paused
    Fallback -.-> impl
    impl -.-> V1
    
    note[Admin updates IMPLEMENTATION_SLOT to upgrade]
    admin -.-> note
    note -.-> V2
```

#### 4. Adapt Layer (Cross-Chain & Relay)

How a Cross-Chain Message triggers a complex sequence of Unshield, Swap, and Re-shield operations.

```mermaid
sequenceDiagram
    participant EVM as EVMAdapt (Sepolia)
    participant Zeta as ZetachainAdapt
    participant Relay as RelayAdapt
    participant Wallet as RailgunSmartWallet

    EVM->>Zeta: onCall(message, zrc20, amount)
    Note over Zeta: Decode Operation
    
    alt SHIELD
        Zeta->>Wallet: shield(requests)
    else TRANSACT
        Zeta->>Wallet: transact(txs)
    else UNSHIELD_OUTSIDE_CHAIN
        Zeta->>Relay: call(unshieldData)
        Relay->>Wallet: transact(unshieldTxs)
        Wallet-->>Relay: Tokens (Unshielded)
        Relay->>Relay: multicall(swap/bridge)
    end
```

#### 5. Governance & Staking System

`Staking.sol` manages Voting Power using a Snapshot system to prevent double-voting and facilitate time-weighted governance.

```mermaid
stateDiagram-v2
    [*] --> Unstaked
    
    Unstaked --> Staked: stake(amount)
    state Staked {
        [*] --> Locked
        Locked --> Unlocked: unlock(stakeID)
        
        state Locked {
            TransferTokens
            UpdateSnapshot
            AddVotingPower
        }
        
        state Unlocked {
            Wait30Days
            RemoveVotingPower
        }
    }
    
    Unlocked --> Claimed: claim(stakeID)
    Staked --> Staked: delegate(to)
    
    note right of Staked
        Snapshots taken on every 
        Stake / Delegate / Unlock
        stored in globalsSnapshots
    end note
```

### Deploy Railgun on Zetachain

Deploys the complete Railgun system (Railgun Smart Wallet, RelayAdapt, ZetachainAdapt) on ZetaChain.

Refer from https://www.zetachain.com/docs/reference/network/contracts

```bash
npx hardhat deploy:railgun \
  --network zetachain-testnet \
  --weth9 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf \
  --zetachaingateway 0x6c533f7fe93fae114d0954697069df33c9b74fd7 \
  --uniswaprouter 0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe
```

### Deploy ZetachainAdapt on Zetachain

If you need to deploy ZetachainAdapt separately (e.g., redeployment or upgrade):

```bash
npx hardhat deploy:zetachainAdapt --network zetachain-testnet
```

The script will automatically load addresses from `deployments/zetachain-testnet.json`:
- `--railgun`: From `contracts.RailgunProxy.address`
- `--relayadapt`: From `contracts.RelayAdapt.address`
- `--uniswaprouter`: From `externalContracts.UniswapRouter`

You can also manually specify any or all parameters to override the deployment config.

### Deploy evmAdapt on Sepolia

```bash
npx hardhat deploy:evmAdapt \
  --gatewayevm 0x0c487a766110c85d301d96e33579c5b317fa4995 \
  --network sepolia
```

The script will automatically load the ZetachainAdapt address from `deployments/zetachain-testnet.json`:
- `--zetachainadapt`: From `contracts.ZetachainAdapt.address`

You can also manually specify the parameter to override the deployment config.

## Deployment Management

### Check Deployed Contracts

After deployment, **always verify** all contracts are deployed correctly:

```bash
# Check contracts on ZetaChain testnet
npx hardhat run deployments/check_deployments.js --network zetachain-testnet

# Check contracts on Sepolia
npx hardhat run deployments/check_deployments.js --network sepolia
```

In testing, contracts deployed successfully on-chain but didn't appear on Blockscout for 30+ minutes. The check script immediately confirmed deployment.

### Deployment Records

All deployment addresses are automatically saved to `deployments/` directory:
- `zetachain-testnet.json` - ZetaChain Athens Testnet
- `sepolia.json` - Ethereum Sepolia Testnet

Each deployment file contains:
- Contract addresses
- Verification status
- Block explorer links
- Deployment metadata (timestamp, deployer, chain ID)

See [deployments/README.md](deployments/README.md) for more details.

### Important Addresses

After deployment, use these addresses for interactions:

- **RailgunProxy**: Main contract for all Railgun operations (upgradeable)
- **RelayAdapt**: Handles multicall operations with Railgun
- **ZetachainAdapt**: Cross-chain adapter for ZetaChain messages

Example (from latest ZetaChain testnet deployment):
```json
{
  "RailgunProxy": "0x1bdFD03a41a3E55d3De49A27231ABEFf2dE25a55",
  "RelayAdapt": "0x92De3D52a9f77c0dfF23c4E367604205F4028DE7",
  "ZetachainAdapt": "0xf8fb7e368A086D09CA35FfDE5f1F38600a6b0420"
}
```

Check `deployments/zetachain-testnet.json` for the complete list.

