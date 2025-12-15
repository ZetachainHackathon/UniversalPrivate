import { NetworkName } from "@railgun-community/shared-models";

export const CONFIG = {
    RAILGUN_NETWORK: {
        NAME: NetworkName.ZetachainTestnet,
        RPC_URL:  "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
        CHAIN_ID: 7001,
    },
    CONTRACTS: {
        TEST_ERC20: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
    },
    TOKENS: {
        // ZRC-20 Tokens on ZetaChain Testnet
        // Format: SYMBOL: { address, decimals (optional, will be fetched from contract if not provided) }
        WZETA: {
            address: "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf", // WZETA on ZetaChain
            decimals: 18,
        },
        // Add more tokens as needed
        // USDT: { address: "...", decimals: 6 },
        // USDC: { address: "...", decimals: 6 },
        ETH_BASE_SEPOLIA: {
            address: "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD",
            decimals: 18,
        },

        ETH_SEPOLIA: { 
            address: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
            decimals: 18,
        },
    },  
    CHAINS: {
        SEPOLIA: {
            ID_DEC: 11155111,
            ID_HEX: "0xaa36a7",
            EVM_ADAPT: "0x7bE4f15d073611A13A9C3C123500Ae445F546246",
            ZRC20_GAS: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
        },
        ZETACHAIN: {
            ID_DEC: 7001,
            ID_HEX: "0x1b59",
            ZETACHAIN_ADAPT: "0x82b09E123d47618bbdCd08ECACB82fB6Da2118A1"
        },
        BASE_SEPOLIA: {
            ID_DEC: 84532,
            ID_HEX: "0x14a34",
            EVM_ADAPT: "0x7bE4f15d073611A13A9C3C123500Ae445F546246",
            ZRC20_GAS: "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD",
        }
    },
    FEES: {
        UNSHIELD_BASIS_POINTS: 25n,
    },
    GAS: {
        MIN_LIMIT_CROSS_CHAIN: 1_000_000n,
    }
} as const;
