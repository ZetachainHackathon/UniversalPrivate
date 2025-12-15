import { Contract, ZeroAddress } from "ethers";
import { CONFIG } from "@/config/env";

/**
 * Token 資訊介面
 */
export interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    balance?: bigint;
    logoUrl?: string;
}

/**
 * 從合約獲取 Token decimals
 */
export const getTokenDecimals = async (
    tokenAddress: string,
    provider: any
): Promise<number> => {
    // Native token (ZeroAddress) 使用 18 decimals
    if (tokenAddress.toLowerCase() === ZeroAddress.toLowerCase()) {
        return 18;
    }

    // 先檢查配置中是否有
    for (const [symbol, token] of Object.entries(CONFIG.TOKENS)) {
        if (token.address.toLowerCase() === tokenAddress.toLowerCase()) {
            return token.decimals || 18;
        }
    }

    // 從合約讀取
    try {
        const erc20Contract = new Contract(
            tokenAddress,
            ["function decimals() view returns (uint8)"],
            provider
        );
        const decimals = await erc20Contract.decimals!();
        return Number(decimals);
    } catch (error) {
        console.warn(`無法獲取 Token decimals (${tokenAddress}), 使用預設值 18:`, error);
        return 18; // 預設值
    }
};

/**
 * 根據地址獲取 Token Symbol
 */
export const getTokenSymbol = (tokenAddress: string): string => {
    // Native token (不支援，但保留處理以防萬一)
    if (tokenAddress.toLowerCase() === ZeroAddress.toLowerCase()) {
        return "WZETA"; // 不支援 Native Token，使用 WZETA
    }

    // 從配置中查找
    for (const [symbol, token] of Object.entries(CONFIG.TOKENS)) {
        if (token.address.toLowerCase() === tokenAddress.toLowerCase()) {
            return symbol;
        }
    }

    // 如果找不到，返回地址前綴
    return `Token (${tokenAddress.slice(0, 6)}...)`;
};

/**
 * 根據 Symbol 獲取 Token 地址
 */
export const getTokenAddressBySymbol = (symbol: string): string | null => {
    const token = CONFIG.TOKENS[symbol as keyof typeof CONFIG.TOKENS];
    return token?.address || null;
};

/**
 * 獲取所有配置的 Token 列表
 */
export const getAllConfiguredTokens = (): TokenInfo[] => {
    return Object.entries(CONFIG.TOKENS).map(([symbol, token]) => ({
        address: token.address,
        symbol,
        decimals: token.decimals || 18,
        logoUrl: "logoUrl" in token ? token.logoUrl : undefined,
    }));
};

/**
 * 根據地址獲取 Token Logo URL
 */
export const getTokenLogoUrl = (tokenAddress: string): string | undefined => {
    // Native token
    if (tokenAddress.toLowerCase() === ZeroAddress.toLowerCase()) {
        return CONFIG.TOKENS.WZETA.logoUrl;
    }

    // 從配置中查找
    for (const [_, token] of Object.entries(CONFIG.TOKENS)) {
        if (token.address.toLowerCase() === tokenAddress.toLowerCase()) {
            return "logoUrl" in token ? token.logoUrl : undefined;
        }
    }

    return undefined;
};


