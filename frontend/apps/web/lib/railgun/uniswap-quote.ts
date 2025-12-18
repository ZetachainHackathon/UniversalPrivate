import { Contract, JsonRpcProvider, parseUnits, formatUnits, ZeroAddress } from "ethers";
import { CONFIG } from "@/config/env";
import { getTokenDecimals } from "./token-utils";

// Uniswap V2 Router ABI (包含 getAmountsOut)
const UNISWAP_V2_ROUTER_ABI = [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function WETH() external pure returns (address)",
] as const;

/**
 * 查詢 Uniswap 匯率（預估可以換到多少目標代幣）
 * @param amountIn 輸入金額（字符串格式，例如 "1.0"）
 * @param tokenIn 輸入代幣地址
 * @param tokenOut 輸出代幣地址
 * @returns 預估的輸出金額（字符串格式）
 */
export const getUniswapQuote = async (
    amountIn: string,
    tokenIn: string,
    tokenOut: string
): Promise<string | null> => {
    try {
        // 如果輸入金額為 0 或空，返回 null
        if (!amountIn || parseFloat(amountIn) <= 0) {
            return null;
        }

        // 如果兩個代幣相同，直接返回輸入金額
        if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
            return amountIn;
        }

        // 將 ZeroAddress (Native Token) 轉換為 WZETA 地址
        let tokenInAddress = tokenIn;
        let tokenOutAddress = tokenOut;
        if (tokenIn === ZeroAddress) {
            tokenInAddress = CONFIG.TOKENS.WZETA.address;
        }
        if (tokenOut === ZeroAddress) {
            tokenOutAddress = CONFIG.TOKENS.WZETA.address;
        }

        // 如果轉換後兩個代幣相同，直接返回輸入金額
        if (tokenInAddress.toLowerCase() === tokenOutAddress.toLowerCase()) {
            return amountIn;
        }

        // 使用 ZetaChain 的 provider（因為所有代幣都在 ZetaChain 上）
        const provider = new JsonRpcProvider(CONFIG.RAILGUN_NETWORK.RPC_URL);
        const routerAddress = CONFIG.RAILGUN_NETWORK.UniswapV2Router;

        if (!routerAddress) {
            console.error("Uniswap Router 地址未配置");
            return null;
        }

        // 獲取代幣 decimals
        const decimalsIn = await getTokenDecimals(tokenInAddress, provider);
        const decimalsOut = await getTokenDecimals(tokenOutAddress, provider);

        // 將輸入金額轉換為 BigInt
        const amountInBigInt = parseUnits(amountIn, decimalsIn);

        // 構建交易路徑
        // 如果其中一個是 WZETA，直接交換；否則通過 WZETA 作為中間代幣
        const wzetaAddress = CONFIG.TOKENS.WZETA.address;
        let path: string[];

        if (tokenInAddress.toLowerCase() === wzetaAddress.toLowerCase() || tokenOutAddress.toLowerCase() === wzetaAddress.toLowerCase()) {
            // 直接交換
            path = [tokenInAddress, tokenOutAddress];
        } else {
            // 通過 WZETA 交換
            path = [tokenInAddress, wzetaAddress, tokenOutAddress];
        }

        // 查詢 Uniswap Router
        const router = new Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, provider) as any;
        const amounts = await router.getAmountsOut(amountInBigInt, path);

        // amounts[0] 是輸入金額，amounts[amounts.length - 1] 是輸出金額
        const amountOut = amounts[amounts.length - 1];
        
        // 轉換為字符串格式
        return formatUnits(amountOut, decimalsOut);
    } catch (error) {
        console.error("查詢 Uniswap 匯率失敗:", error);
        return null;
    }
};

/**
 * 計算扣除手續費後的預估輸出金額
 * @param amountIn 輸入金額（字符串格式）
 * @param tokenIn 輸入代幣地址
 * @param tokenOut 輸出代幣地址
 * @returns 扣除手續費後的預估輸出金額（字符串格式）
 */
export const getEstimatedOutputAfterFee = async (
    amountIn: string,
    tokenIn: string,
    tokenOut: string
): Promise<string | null> => {
    try {
        // 先扣除 Unshield 手續費（0.25%）
        const unshieldFeeBasisPoints = CONFIG.FEES.UNSHIELD_BASIS_POINTS;
        
        // 如果輸入金額為 0 或空，返回 null
        if (!amountIn || parseFloat(amountIn) <= 0) {
            return null;
        }

        // 如果兩個代幣相同，直接扣除手續費後返回
        if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
            const provider = new JsonRpcProvider(CONFIG.RAILGUN_NETWORK.RPC_URL);
            const decimals = await getTokenDecimals(tokenIn, provider);
            const amountInBigInt = parseUnits(amountIn, decimals);
            const amountAfterFee = (amountInBigInt * (10000n - unshieldFeeBasisPoints)) / 10000n;
            return formatUnits(amountAfterFee, decimals);
        }

        // 扣除 Unshield 手續費
        const provider = new JsonRpcProvider(CONFIG.RAILGUN_NETWORK.RPC_URL);
        const decimalsIn = await getTokenDecimals(tokenIn, provider);
        const amountInBigInt = parseUnits(amountIn, decimalsIn);
        const amountAfterUnshieldFee = (amountInBigInt * (10000n - unshieldFeeBasisPoints)) / 10000n;
        const amountAfterFeeString = formatUnits(amountAfterUnshieldFee, decimalsIn);

        // 查詢 Uniswap 匯率（使用扣除手續費後的金額）
        const quote = await getUniswapQuote(amountAfterFeeString, tokenIn, tokenOut);
        
        return quote;
    } catch (error) {
        console.error("計算預估輸出金額失敗:", error);
        return null;
    }
};

