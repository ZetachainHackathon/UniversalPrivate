# RAILGUN Contracts

## Getting started

- Install Node.js - using [nvm](https://github.com/nvm-sh/nvm) is recommended
- Run `npm i` to install dependencies
- (Optional) Setup hardhat local network config in `~/.hardhat/networks.{js|ts|json}` following the [hardhat-local-networks-config-plugin](https://github.com/facuspagnuolo/hardhat-local-networks-config-plugin) format.
- (Optional) Install `hardhat-shorthand` to use `hh` commands.
- Run `hh help` or `npx hardhat help` for list of commands

### Depoly railgun on Zetachain

```
npx hardhat deploy:zetachain --network zetachain-testnet --weth9 0x0000c9ec4042283e8139c74f4c64bcd1e0b9b54f  
```

### Depoly evmAdapt on Sepolia

```
npx hardhat deploy:evmAdapt \
  --gatewayevm 0x0c487a766110c85d301d96e33579c5b317fa4995 \
  --zetachainadapt <zetachainAdapt> \
  --network sepolia
```

