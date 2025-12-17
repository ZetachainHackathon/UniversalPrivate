import { useState } from "react";
import { parseUnits, ZeroAddress } from "ethers";
import { executeAddLiquidity, executeAddLiquidityFromEvm } from "@/lib/railgun/liquidity";
import { CONFIG } from "@/config/env";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";
import { toast } from "@repo/ui/components/sonner";
import { CONTENT } from "@/config/content";
import { getTokenDecimals } from "@/lib/railgun/token-utils";

/**
 * 根據 chainId 獲取對應的 CONFIG.CHAINS key
 */
const getChainKeyFromChainId = (chainId: bigint): string | null => {
    for (const [key, config] of Object.entries(CONFIG.CHAINS)) {
        if (BigInt(config.ID_DEC) === chainId) {
            return key;
        }
    }
    return null;
};

interface UseLiquidityTxProps {
    tokenA: string;
    tokenB: string;
    amountA: string;
    amountB: string;
    // password: string; // Removed: Logic moved to Context
}

export const useLiquidityTransaction = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState("");

    const { signer, isConnected, connectWallet, getCurrentChainId } = useWallet();
    const { walletInfo, encryptionKey } = useRailgun();

    const executeAddLiquidityTx = async ({
        tokenA,
        tokenB,
        amountA,
        amountB,
    }: UseLiquidityTxProps) => {
        // 1. 基本檢查
        const railgunAddress = walletInfo?.railgunAddress;
        const walletId = walletInfo?.id;

        if (!railgunAddress || !walletId) {
            toast.error(CONTENT.ERRORS.RAILGUN_WALLET_LOCKED);
            return;
        }
        if (!encryptionKey) {
            toast.error(CONTENT.ERRORS.RAILGUN_WALLET_RELOGIN);
            return;
        }

        // 2. 連接檢查
        if (!isConnected || !signer) {
            try {
                await connectWallet();
                return;
            } catch (e) {
                toast.error(CONTENT.ERRORS.WALLET_NOT_CONNECTED);
                return;
            }
        }

        // 3. 獲取當前連接的鏈 ID
        const currentChainId = await getCurrentChainId();
        if (!currentChainId) {
            toast.error("無法獲取當前鏈信息");
            return;
        }

        // 4. 判斷當前鏈類型
        const isZetachain = currentChainId === BigInt(CONFIG.CHAINS.ZETACHAIN.ID_DEC);
        const currentChainKey = getChainKeyFromChainId(currentChainId);

        setIsLoading(true);
        const toastId = toast.loading(CONTENT.TOASTS.PREPARING_TX);
        setTxHash("");

        try {
            // 5. 驗證代幣地址
            if (!tokenA || tokenA === ZeroAddress || tokenA === "") {
                toast.error("請選擇有效的代幣 A", { id: toastId });
                return;
            }
            if (!tokenB || tokenB === ZeroAddress || tokenB === "") {
                toast.error("請選擇有效的代幣 B", { id: toastId });
                return;
            }
            if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
                toast.error("代幣 A 和代幣 B 不能相同", { id: toastId });
                return;
            }

            // 6. 驗證金額
            if (!amountA || parseFloat(amountA) <= 0) {
                toast.error("請輸入有效的代幣 A 金額", { id: toastId });
                return;
            }
            if (!amountB || parseFloat(amountB) <= 0) {
                toast.error("請輸入有效的代幣 B 金額", { id: toastId });
                return;
            }

            // 7. 獲取代幣 decimals
            if (!signer?.provider) {
                toast.error("無法獲取 Provider", { id: toastId });
                return;
            }

            const decimalsA = await getTokenDecimals(tokenA, signer.provider);
            const decimalsB = await getTokenDecimals(tokenB, signer.provider);
            const amountABigInt = parseUnits(amountA, decimalsA);
            const amountBBigInt = parseUnits(amountB, decimalsB);

            // 8. 計算滑點保護（5% 滑點）
            const slippageBps = 500; // 5% = 500 basis points
            const amountAMin = (amountABigInt * BigInt(10000 - slippageBps)) / 10000n;
            const amountBMin = (amountBBigInt * BigInt(10000 - slippageBps)) / 10000n;

            toast.loading("正在生成零知識證明...", { id: toastId });

            // 9. 執行添加流動性
            // TODO: 從 CONFIG 獲取 Uniswap Router 地址
            const uniswapRouterAddress = undefined; // 待配置

            let txResponse;

            if (isZetachain) {
                // 在 Zetachain 上直接執行
                txResponse = await executeAddLiquidity(
                    walletId,
                    tokenA,
                    tokenB,
                    amountABigInt,
                    amountBBigInt,
                    amountAMin,
                    amountBMin,
                    encryptionKey, // Use Context Key
                    signer,
                    uniswapRouterAddress,
                    false, // shouldShieldLPToken - 暫時不 shield LP Token
                    undefined // railgunAddress - 暫時不需要
                );
            } else {
                // 在其他鏈上透過 EVMAdapt 執行
                if (!currentChainKey) {
                    toast.error(`不支援的鏈: ${currentChainId.toString()}`, { id: toastId });
                    return;
                }

                // 檢查該鏈是否支援 EVMAdapt
                const chainConfig = CONFIG.CHAINS[currentChainKey as keyof typeof CONFIG.CHAINS];
                if (!("EVM_ADAPT" in chainConfig) || !chainConfig.EVM_ADAPT) {
                    toast.error(`鏈 ${currentChainKey} 未配置 EVMAdapt 地址`, { id: toastId });
                    return;
                }

                txResponse = await executeAddLiquidityFromEvm(
                    walletId,
                    tokenA,
                    tokenB,
                    amountABigInt,
                    amountBBigInt,
                    amountAMin,
                    amountBMin,
                    encryptionKey, // Use Context Key
                    signer,
                    currentChainKey, // 傳入大寫的 key，如 "SEPOLIA", "BASE_SEPOLIA"
                    uniswapRouterAddress,
                    false, // shouldShieldLPToken - 暫時不 shield LP Token
                    undefined // railgunAddress - 暫時不需要
                );
            }

            toast.loading(CONTENT.TOASTS.TX_SUBMITTED, { id: toastId });
            setTxHash(txResponse.hash);
            toast.success(CONTENT.TOASTS.TX_SUBMITTED, { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(CONTENT.ERRORS.TX_FAILED + (error.reason || error.message), { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        executeAddLiquidity: executeAddLiquidityTx,
        isLoading,
        txHash,
    };
};

