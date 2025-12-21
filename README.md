# Universal Private

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Status](https://img.shields.io/badge/status-Testnet-orange.svg) 

**Universal Private** is a revolutionary universal privacy solution built on [ZetaChain](https://www.zetachain.com/) and [RAILGUN](https://railgun.org/). It enables **cross-chain privacy transactions**, allowing users to interact with DeFi protocols, privacy pools, and transfers across any chain while maintaining complete anonymity.

We integrate the Railgun privacy system with ZetaChain's omnichain capabilities to create a unified privacy layer. This repository contains the core contracts, a web frontend demo, a backend/testing suite, and the **Universal Private SDK** for developers.

## 🌟 Key Features

*   **Universal Privacy**: Perform private transactions on any supported chain.
*   **Cross-Chain Shielding**: Move funds from Ethereum, BSC, Base, Arbitrum, Avalanche, Polygon, and more directly into the Railgun privacy system on ZetaChain.
*   **0zk Address**: Create a Zero-Knowledge address (0zk) to hold and manage funds privately.
*   **Private DeFi**: Interact with DeFi protocols (Swap, Liquidity Provision) anonymously.
*   **Unshield Anywhere**: Withdraw funds from your privacy account to a public address on any supported chain.
*   **Developer SDK**: A comprehensive Typescript SDK to integrate Universal Private features into your own dApps and wallets.

## 🏗 Architecture

Universal Private leverages **ZetaChain** for cross-chain messaging and interoperability, and **Railgun** for zero-knowledge privacy.

```mermaid
graph TD
    subgraph "External Chains (Source/Destination)"
        User[User / Public Address]
        EVMAdapt[EVM Adapt Contract]
    end

    subgraph "ZetaChain (Privacy Layer)"
        ZetaAdapt[Zetachain Adapt Contract]
        RelayAdapt["Relay Adapt (Execution Layer)"]
        RailgunWallet["Railgun Smart Wallet (0zk System)"]
        DeFi[DeFi Protocols]
    end

    User -- "1. Shield (Deposit)" --> EVMAdapt
    EVMAdapt -- "Cross-Chain Message" --> ZetaAdapt
    ZetaAdapt -- "Deposit" --> RailgunWallet
    
    User -- "2. Private Transfer / DeFi" --> RailgunWallet
    RailgunWallet -- "Zero-Knowledge Proof" --> RelayAdapt
    RelayAdapt -- "Interact" --> DeFi
    
    RailgunWallet -- "3. Unshield (Withdraw)" --> RelayAdapt
    RelayAdapt -- "Withdraw" --> ZetaAdapt
    ZetaAdapt -- "Cross-Chain Message" --> EVMAdapt
    EVMAdapt -- "Funds" --> User

    style ZetaChain fill:#e9f5ff,stroke:#005da0,stroke-width:2px
```

## 📂 Project Structure

*   `contract/`: Smart contracts including `ZetaChainAdapt` (ZetaChain) and `EVMAdapt` (Other EVM chains).
*   `frontend/`: A Next.js Web Application demonstrating the full capabilities of Universal Private.
*   `test/`: Node.js scripts for backend testing and command-line usage demos.
*   `frontend/packages/sdk/`: The **Universal Private SDK** source code.

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **pnpm** (for frontend)
*   **npm** (for test scripts)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ZetachainHackathon/UniversalPrivate.git
    cd UniversalPrivate
    ```

2.  **Run the Web Demo**:
    ```bash
    cd frontend
    pnpm install
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

    > **Note**: The Web Demo creates a client-side wallet. You can generate a 0zk address using a mnemonic.

    For more details, please refer to the [Frontend README](frontend/README.md).
    Or try it out on Web Demo Page: [Universal Web Demo Page](https://universal-private.vercel.app/)

3.  **Run Node.js Tests/Backend**:
    ```bash
    cd test
    npm install
    # Run specific tests
    npm run test
    ```
    This folder contains scripts to programmatically interact with the Shield, Unshield, and Transfer functions.

## 📜 Smart Contracts

For detailed deployment guides, architecture diagrams, and verified contract addresses, please refer to the [Contract Documentation](contract/README.md).

It covers:
*   **Deployment**: How to deploy to ZetaChain and and other EVM chains.
*   **Architecture**: Detailed system design and interaction flows.
*   **Verification**: Scripts to verify deployments.

## 📦 Universal Private SDK

[![npm version](https://img.shields.io/npm/v/@st99005912/universal-private-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@st99005912/universal-private-sdk)
[![Downloads](https://img.shields.io/npm/dm/@st99005912/universal-private-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@st99005912/universal-private-sdk)

A professional SDK for privacy-preserving interactions and blockchain integration, supporting both **Node.js** and **Web** environments.

### Installation

```bash
# using npm
npm install @st99005912/universal-private-sdk

# using pnpm
pnpm add @st99005912/universal-private-sdk
```

*(See [npm page](https://www.npmjs.com/package/@st99005912/universal-private-sdk) for more options)*

### SDK Usage

For detailed installation instructions, API documentation, and code examples, please refer to the [SDK Documentation](frontend/packages/sdk/README.md).

Quick summary of available functions:
*   **Shield**: Deposit public funds into the privacy system.
*   **Private Transfer**: Send funds anonymously between 0zk addresses.
*   **Cross-Chain Transfer**: Move private funds across different blockchains.
*   **Connect**: Managing wallet connection.


## 🔒 Advanced Privacy (Waku & Broadcaster)

For maximum privacy, we recommend using **Waku** and **Broadcasters**.

*   **Broadcaster (Relayer)**: execute "gasless" meta-transactions. Users verify proofs and sign transactions without spending their own gas or revealing their IP directly to the blockchain node. This also removes the need for cross-chain message fees on the user side when operating on ZetaChain.
*   **Waku**: A decentralized communication layer that hides your IP address by routing messages through a p2p network before reaching the Broadcaster.

*See [Railgun Privacy System Docs](https://docs.railgun.org/wiki/learn/privacy-system/community-broadcasters) for configuration details.*

## 🌐 Supported Networks (Testnet)

Currently live on Testnets:
*   **ZetaChain Athens 3** (Hub)
*   **Ethereum Sepolia**
*   **Base Sepolia**
*   **Arbitrum Sepolia**
*   **BSC Testnet**
*   **Avalanche Fuji**
*   **Polygon Amoy**
*   **Kaia Testnet**

**Future Roadmap**:
*   Mainnet Launch
*   Non-EVM Chain Support: **Solana**, **Sui**, **TON**.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
