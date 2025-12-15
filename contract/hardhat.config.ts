import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomiclabs/hardhat-ethers';
import '@nomicfoundation/hardhat-verify';
import '@typechain/hardhat';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-local-networks-config-plugin';
import * as dotenv from "dotenv";
dotenv.config();

import './tasks';

import mocharc from './.mocharc.json';

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    "zetachain-testnet": {
      url: "https://zetachain-athens.g.allthatnode.com/archive/evm",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 7001, // ZetaChain Testnet (Athens)
    },
    "sepolia": {
      url: "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111, // Ethereum Sepolia Testnet
    },
    "base-sepolia": {
      url: "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532, // Base Sepolia Testnet
    },
    "arbitrum-sepolia": {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614, // Arbitrum Sepolia Testnet
    },
    "bsc-testnet": {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 97, // BSC Testnet
    },
    "kaia-testnet": {
      url: "https://public-en-kairos.node.kaia.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1001, // Kaia Testnet (Kairos) - Note: ChainId corrected from 2025
    },
    "avalanche-testnet": {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 43113, // Avalanche Fuji Testnet
    },
    "polygon-testnet": {
      url: "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002, // Polygon Amoy Testnet - Note: ChainId corrected from 80001
    }
    // Note: TON Testnet is not an EVM-compatible chain, so it cannot be used with Hardhat
    // Removed "ton-testnet" as it's not compatible with EVM tooling
  },
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          // Enable in future if contract size is an issue
          // Not enabling now because hardhat stack traces and
          // coverage reporting don't yet support it
          // viaIR: true,
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
      {
        version: '0.8.26',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
    ],
    overrides: {
      // Enable this to turn of viaIR for proxy contract
      // 'contracts/proxy/Proxy.sol': {
      //   version: '0.8.17',
      //   settings: {
      //     viaIR: false,
      //   },
      // },
    },
  },
  mocha: mocharc,
  gasReporter: {
    enabled: true,
    currency: 'USD',
  },
  etherscan: {
    apiKey: {
      "zetachain-testnet": process.env.BLOCKSCOUT_API_KEY || "",
    },
    customChains: [
      {
        network: "zetachain-testnet",
        chainId: 7001,
        urls: {
          apiURL: "https://testnet.zetascan.com/api",
          browserURL: "https://testnet.zetascan.com/",
        }
      }
    ],
    
  },
  
};

export default config;
