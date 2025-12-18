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

/**
 * 根據目標鏈獲取可用的目標代幣列表
 * @param targetChain 目標鏈名稱（如 "sepolia", "base-sepolia"）
 * @returns 可用代幣列表，包含地址、符號、小數位數和 Logo
 */
export const getAvailableTargetTokens = (targetChain: string): TokenInfo[] => {
    // 如果 targetChain 為空或未定義，返回空陣列
    if (!targetChain || typeof targetChain !== "string" || targetChain.trim() === "") {
        return [];
    }

    // 將目標鏈名稱轉換為大寫並替換連字符為底線（如 "sepolia" -> "SEPOLIA", "base-sepolia" -> "BASE_SEPOLIA"）
    const chainKey = targetChain.toUpperCase().replace(/-/g, "_") as keyof typeof CONFIG.CHAINS;
    
    // 如果鏈不存在，返回空陣列
    if (!(chainKey in CONFIG.CHAINS)) {
        return [];
    }

    // 獲取該鏈的 ZRC20_GAS 地址（作為預設代幣）
    const chainConfig = CONFIG.CHAINS[chainKey];
    const gasTokenAddress = "ZRC20_GAS" in chainConfig ? chainConfig.ZRC20_GAS : null;

    // 從 CONFIG.TOKENS 中篩選出屬於該鏈的代幣
    // 代幣命名規則：SYMBOL_CHAIN（如 ETH_SEPOLIA, USDC_SEPOLIA）
    const availableTokens: TokenInfo[] = [];
    
    for (const [symbol, token] of Object.entries(CONFIG.TOKENS)) {
        const symbolUpper = symbol.toUpperCase();
        const chainKeyUpper = chainKey.toUpperCase();
        
        // 檢查代幣符號是否以該鏈的名稱結尾
        const endsWithChain = symbolUpper.endsWith(`_${chainKeyUpper}`) || symbolUpper === chainKeyUpper;
        
        if (endsWithChain) {
            // 特別處理：如果目標鏈是 SEPOLIA，排除所有包含 BASE_SEPOLIA 或 ARBITRUM_SEPOLIA 的代幣
            if (chainKeyUpper === "SEPOLIA") {
                if (symbolUpper.includes("_BASE_SEPOLIA") || symbolUpper.includes("_ARBITRUM_SEPOLIA")) {
                    continue; // 跳過這個代幣
                }
            }
            
            // 如果目標鏈是 BASE_SEPOLIA，排除所有包含 SEPOLIA 但不是 BASE_SEPOLIA 的代幣
            if (chainKeyUpper === "BASE_SEPOLIA") {
                if (symbolUpper.includes("_SEPOLIA") && !symbolUpper.includes("_BASE_SEPOLIA")) {
                    continue; // 跳過這個代幣
                }
            }
            
            // 如果目標鏈是 ARBITRUM_SEPOLIA，排除所有包含 SEPOLIA 但不是 ARBITRUM_SEPOLIA 的代幣
            if (chainKeyUpper === "ARBITRUM_SEPOLIA") {
                if (symbolUpper.includes("_SEPOLIA") && !symbolUpper.includes("_ARBITRUM_SEPOLIA")) {
                    continue; // 跳過這個代幣
                }
            }
            
            availableTokens.push({
                address: token.address,
                symbol,
                decimals: token.decimals || 18,
                logoUrl: "logoUrl" in token ? token.logoUrl : undefined,
            });
        }
    }

    // 如果沒有找到匹配的代幣，但鏈有 ZRC20_GAS，則返回 Gas Token
    if (availableTokens.length === 0 && gasTokenAddress) {
        // 從 CONFIG.TOKENS 中查找對應的 Gas Token
        for (const [symbol, token] of Object.entries(CONFIG.TOKENS)) {
            if (token.address.toLowerCase() === gasTokenAddress.toLowerCase()) {
                availableTokens.push({
                    address: token.address,
                    symbol,
                    decimals: token.decimals || 18,
                    logoUrl: "logoUrl" in token ? token.logoUrl : undefined,
                });
                break;
            }
        }
    }

    // 將 Gas Token 放在第一位（如果存在）
    if (gasTokenAddress) {
        const gasTokenIndex = availableTokens.findIndex(
            token => token.address.toLowerCase() === gasTokenAddress.toLowerCase()
        );
        if (gasTokenIndex > 0) {
            const gasToken = availableTokens.splice(gasTokenIndex, 1)[0];
            if (gasToken) {
                availableTokens.unshift(gasToken);
            }
        }
    }

    return availableTokens;
};


