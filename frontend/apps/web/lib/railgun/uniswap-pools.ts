import { Contract, type Provider } from "ethers";
import { CONFIG } from "@/config/env";
import { getTokenSymbol, getTokenLogoUrl } from "./token-utils";

// Uniswap V2 Factory ABI
const UNISWAP_V2_FACTORY_ABI = [
    "function getPair(address tokenA, address tokenB) external view returns (address pair)",
    "function allPairs(uint) external view returns (address pair)",
    "function allPairsLength() external view returns (uint)",
];

// Uniswap V2 Pair ABI
const UNISWAP_V2_PAIR_ABI = [
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function totalSupply() external view returns (uint256)",
];

export interface PoolInfo {
    pairAddress: string;
    token0: string;
    token1: string;
    token0Symbol: string;
    token1Symbol: string;
    token0LogoUrl: string | null;
    token1LogoUrl: string | null;
    reserve0: bigint;
    reserve1: bigint;
    totalSupply: bigint;
}

/**
 * 獲取指定代幣對的池子地址
 */
export const getPairAddress = async (
    tokenA: string,
    tokenB: string,
    provider: Provider
): Promise<string> => {
    const factoryAddress = CONFIG.RAILGUN_NETWORK.UniswapV2Factory;
    const factory = new Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, provider) as any;
    
    // 確保 tokenA < tokenB（Uniswap V2 要求）
    const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() 
        ? [tokenA, tokenB] 
        : [tokenB, tokenA];
    
    const pairAddress = await factory.getPair(token0, token1);
    return pairAddress;
};

/**
 * 檢查池子是否存在
 */
export const checkPairExists = async (
    tokenA: string,
    tokenB: string,
    provider: Provider
): Promise<boolean> => {
    const pairAddress = await getPairAddress(tokenA, tokenB, provider);
    return pairAddress !== "0x0000000000000000000000000000000000000000";
};

/**
 * 獲取池子詳細信息
 */
export const getPoolInfo = async (
    tokenA: string,
    tokenB: string,
    provider: Provider
): Promise<PoolInfo | null> => {
    const factoryAddress = CONFIG.RAILGUN_NETWORK.UniswapV2Factory;
    const factory = new Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, provider) as any;
    
    // 確保 tokenA < tokenB
    const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() 
        ? [tokenA, tokenB] 
        : [tokenB, tokenA];
    
    const pairAddress = await factory.getPair(token0, token1);
    
    if (pairAddress === "0x0000000000000000000000000000000000000000") {
        return null;
    }
    
    const pair = new Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider) as any;
    
    const [reserves, totalSupply, actualToken0, actualToken1] = await Promise.all([
        pair.getReserves(),
        pair.totalSupply(),
        pair.token0(),
        pair.token1(),
    ]);
    
    // 根據 token0 和 token1 的順序確定 reserve0 和 reserve1
    const isTokenAFirst = actualToken0.toLowerCase() === token0.toLowerCase();
    
    const token0Symbol = getTokenSymbol(actualToken0);
    const token1Symbol = getTokenSymbol(actualToken1);
    const token0LogoUrl = getTokenLogoUrl(actualToken0);
    const token1LogoUrl = getTokenLogoUrl(actualToken1);
    
    return {
        pairAddress,
        token0: actualToken0,
        token1: actualToken1,
        token0Symbol,
        token1Symbol,
        token0LogoUrl: token0LogoUrl || null,
        token1LogoUrl: token1LogoUrl || null,
        reserve0: isTokenAFirst ? reserves[0] : reserves[1],
        reserve1: isTokenAFirst ? reserves[1] : reserves[0],
        totalSupply: totalSupply,
    };
};

/**
 * 從常見代幣對生成可能的池子列表
 * 這是一個輔助函數，用於顯示已知的池子
 */
export const getCommonTokenPairs = (): Array<{ tokenA: string; tokenB: string }> => {
    const tokens = Object.values(CONFIG.TOKENS);
    const pairs: Array<{ tokenA: string; tokenB: string }> = [];
    
    // 生成常見的代幣對（例如：WZETA 與其他代幣）
    const wzeta = CONFIG.TOKENS.WZETA;
    if (wzeta) {
        tokens.forEach((token) => {
            if (token.address !== wzeta.address) {
                pairs.push({
                    tokenA: wzeta.address,
                    tokenB: token.address,
                });
            }
        });
    }
    
    // 也可以添加其他常見對，例如穩定幣對
    const usdcSepolia = CONFIG.TOKENS.USDC_SEPOLIA;
    const usdtSepolia = CONFIG.TOKENS.USDTT_SEPOLIA;
    if (usdcSepolia && usdtSepolia) {
        pairs.push({
            tokenA: usdcSepolia.address,
            tokenB: usdtSepolia.address,
        });
    }
    
    return pairs;
};

/**
 * 批量獲取池子信息（用於顯示池子列表）
 */
export const getPoolsInfo = async (
    tokenPairs: Array<{ tokenA: string; tokenB: string }>,
    provider: Provider
): Promise<PoolInfo[]> => {
    const pools: PoolInfo[] = [];
    
    for (const pair of tokenPairs) {
        try {
            const poolInfo = await getPoolInfo(pair.tokenA, pair.tokenB, provider);
            if (poolInfo) {
                pools.push(poolInfo);
            }
        } catch (error) {
            // 池子不存在或查詢失敗，跳過
            console.warn(`Failed to get pool info for ${pair.tokenA}/${pair.tokenB}:`, error);
        }
    }
    
    return pools;
};

