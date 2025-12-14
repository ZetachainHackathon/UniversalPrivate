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
    }
} as const;
