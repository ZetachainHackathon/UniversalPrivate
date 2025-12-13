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

### Depoly evmAdapt on Sepolia

```
npx hardhat deploy:evmAdapt \
  --gatewayevm 0x0c487a766110c85d301d96e33579c5b317fa4995 \
  --zetachainadapt <zetachainAdapt> \
  --network sepolia
```

