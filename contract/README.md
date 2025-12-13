# RAILGUN Contracts

## Getting started

- Install Node.js - using [nvm](https://github.com/nvm-sh/nvm) is recommended
- Run `npm i` to install dependencies
- (Optional) Setup hardhat local network config in `~/.hardhat/networks.{js|ts|json}` following the [hardhat-local-networks-config-plugin](https://github.com/facuspagnuolo/hardhat-local-networks-config-plugin) format.
- (Optional) Install `hardhat-shorthand` to use `hh` commands.
- Run `hh help` or `npx hardhat help` for list of commands


### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         跨鏈生態系統                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  其他 EVM 鏈                          ZetaChain                   │
│  ┌─────────────┐                    ┌──────────────────┐         │
│  │  EVMAdapt   │───跨鏈訊息─────────▶│ ZetachainAdapt   │         │
│  └─────────────┘                    └────────┬─────────┘         │
│        │                                     │                   │
│        │                                     │ 委託複雜操作        │
│        │                                     ▼                   │
│        │                            ┌──────────────────┐         │
│        │                            │   RelayAdapt     │◀───┐    │
│        │                            │   (通用執行層)    │     │   │
│        │                            └────────┬─────────┘     │   │
│        │                                     │               │   │
│        └──────直接呼叫─────────────────────────┼──────────────┘   │
│                                              ▼                   │
│                                    ┌───────────────────┐         │
│                                    │ RailgunSmartWallet│         │
│                                    └───────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

### Depoly railgun on Zetachain

refer from https://www.zetachain.com/docs/reference/network/contracts

```
npx hardhat deploy:zetachain \
  --network zetachain-testnet \
  --weth9 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf \
  --zetachaingateway 0x6c533f7fe93fae114d0954697069df33c9b74fd7\
  --uniswaprouter 0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe
```

### Deploy evmAdapt on Sepolia

```bash
npx hardhat deploy:evmAdapt \
  --gatewayevm 0x0c487a766110c85d301d96e33579c5b317fa4995 \
  --zetachainadapt <zetachainAdapt> \
  --network sepolia
```

## Deployment Management

### Check Deployed Contracts

After deployment, verify all contracts are deployed correctly:

```bash
# Check contracts on ZetaChain testnet
npx hardhat run deployments/check_deployments.js --network zetachain-testnet

# Check contracts on Sepolia
npx hardhat run deployments/check_deployments.js --network sepolia
```

The check script will display:
- ✓ Contract deployment status
- 📝 Verification status on block explorer
- 🔗 Block explorer links
- 📊 Deployment summary

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

