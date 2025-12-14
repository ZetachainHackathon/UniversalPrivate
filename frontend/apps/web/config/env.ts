import { NetworkName } from "@railgun-community/shared-models";

export const CONFIG = {
    NETWORK: {
        NAME: (process.env.NEXT_PUBLIC_NETWORK_NAME || NetworkName.ZetachainTestnet) as NetworkName,
        RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
        CHAIN_ID: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 7001),
    },
    CONTRACTS: {
        // defaults can be placeholders if real env vars are preferred
        ZETA_ADAPT: process.env.NEXT_PUBLIC_ZETA_ADAPT_ADDRESS || "",
        RAILGUN: process.env.NEXT_PUBLIC_RAILGUN_PROXY_ADDRESS || "",
        TEST_ERC20: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
        DEFAULT_ADAPT: "0xc32AfcB92B92886ca08d288280127d5F1A535AaF", // Sepolia EVMAdapt
        ZETACHAIN_ADAPT: "0xFaf96D14d74Ee9030d89d5FD2eB479340F32843E",
        ZRC20_ETH: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
        TARGET_ZRC20: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
    },
    CHAINS: {
        SEPOLIA: {
            ID_DEC: 11155111,
            ID_HEX: "0xaa36a7",
        },
        ZETACHAIN: {
            ID_DEC: 7001,
            ID_HEX: "0x1b59",
        }
    }
} as const;
