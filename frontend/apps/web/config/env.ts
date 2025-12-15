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
        // Format: SYMBOL_CHAIN: { address, decimals }
        // Note: The same ERC-20 token from different chains are represented as different ZRC-20 tokens
        // Source: https://www.zetachain.com/docs/developers/evm/zrc20
        // API: https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/fungible/foreign_coins
        
        // Native ZetaChain Token
        WZETA: {
            address: "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf", // WZETA on ZetaChain
            decimals: 18,
        },
        
        // ETH from different chains (ZRC-20 representation)
        ETH_BASE_SEPOLIA: {
            address: "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD", // ETH.BASESEP
            decimals: 18,
        },
        ETH_SEPOLIA: {
            address: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0", // ETH.ETHSEP
            decimals: 18,
        },
        
        // Stablecoins from Sepolia (ZRC-20 representation)
        USDC_SEPOLIA: {
            address: "0xcC683A782f4B30c138787CB5576a86AF66fdc31d", // USDC.ETHSEP
            decimals: 6,
        },
        USDCT_SEPOLIA: {
            address: "0xe134d947644F90486C8106Ee528b1CD3e54A385e", // USDCT.SEPOLIA
            decimals: 6,
        },
        USDTT_SEPOLIA: {
            address: "0xD45F47412073b75B7c70728aD9A45Dee0ee01bac", // USDTT.SEPOLIA
            decimals: 6,
        },
        
        // Stablecoins from Base Sepolia (ZRC-20 representation)
        USDC_BASE_SEPOLIA: {
            address: "0xd0eFed75622e7AA4555EE44F296dA3744E3ceE19", // USDC.BASESEP
            decimals: 6,
        },
        USDCT_BASE_SEPOLIA: {
            address: "0x4888591FC8529b6a9B3B67b7aE93D3Ef4226BcE4", // USDCT.BASESEP
            decimals: 6,
        },
        USDTT_BASE_SEPOLIA: {
            address: "0x960eC27edE698F8F1977C6A32a75ac937a9c8381", // USDTT.BASESEP
            decimals: 6,
        },
        
        // Gas tokens from different chains (ZRC-20 representation)
        // Note: These are native gas tokens from various chains represented as ZRC-20 on ZetaChain
        ETH_ARBITRUM_SEPOLIA: {
            address: "0x1de70f3e971B62A0707dA18100392af14f7fB677", // ETH.ARBSEP
            decimals: 18,
        },
        BNB_BSC: {
            address: "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891", // BNB.BSC
            decimals: 18,
        },
        SUI_SUI: {
            address: "0x3e128c169564DD527C8e9bd85124BF6A890E5a5f", // SUI.SUI
            decimals: 9,
        },
        SOL_SOLANA: {
            address: "0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501", // SOL.SOL
            decimals: 9,
        },
        KAIA_KAIROS: {
            address: "0xe1A4f44b12eb72DC6da556Be9Ed1185141d7C23c", // KAIA.KAIROS
            decimals: 18,
        },
        BTC_SIGNET: {
            address: "0xdbfF6471a79E5374d771922F2194eccc42210B9F", // sBTC.BTC
            decimals: 8,
        },
        BTC_TESTNET4: {
            address: "0xfC9201f4116aE6b054722E10b98D904829b469c3", // tBTC.BTC
            decimals: 8,
        },
        AVAX_FUJI: {
            address: "0xEe9CC614D03e7Dbe994b514079f4914a605B4719", // AVAX.FUJI
            decimals: 18,
        },
        POL_AMOY: {
            address: "0x777915D031d1e8144c90D025C594b3b8Bf07a08d", // POL.AMOY
            decimals: 18,
        },
        TON_TON: {
            address: "0x54Bf2B1E91FCb56853097BD2545750d218E245e1", // TON.TON
            decimals: 9,
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
