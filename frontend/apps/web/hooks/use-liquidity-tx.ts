import { useState } from "react";
import { parseUnits, ZeroAddress } from "ethers";
import { executeAddLiquidity, executeAddLiquidityFromEvm, executeRemoveLiquidity, executeRemoveLiquidityFromEvm } from "@/lib/railgun/liquidity";
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
    const [isLoadingRemove, setIsLoadingRemove] = useState(false);
    const [txHashRemove, setTxHashRemove] = useState("");

    const { signer, isConnected, connectWallet, getCurrentChainId } = useWallet();
    const { walletInfo, encryptionKey, refresh } = useRailgun();

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
            // 驗證 Uniswap Router 地址已配置
            if (!CONFIG.RAILGUN_NETWORK.UniswapV2Router) {
                toast.error("Uniswap Router 地址未配置", { id: toastId });
                return;
            }

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
                        true, // shouldShieldLPToken - 啟用 LP Token Shield 回 Railgun 隱私池
                        railgunAddress // railgunAddress - 傳入 Railgun 地址以便 Shield LP Token
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
                        true, // shouldShieldLPToken - 啟用 LP Token Shield 回 Railgun 隱私池
                        railgunAddress // railgunAddress - 傳入 Railgun 地址以便 Shield LP Token
                    );
            }

                toast.loading(CONTENT.TOASTS.TX_SUBMITTED, { id: toastId });
                setTxHash(txResponse.hash);
                toast.success(CONTENT.TOASTS.TX_SUBMITTED, { id: toastId });
                
                // 等待交易確認後，自動刷新 Railgun 餘額以顯示新的 LP Token
                toast.loading("等待交易確認...", { id: toastId });
                const receipt = await txResponse.wait();
                console.log("✅ 交易確認:", receipt);
                
                // 等待多個區塊確認，確保 Railgun 掃描器能夠捕獲到交易
                toast.loading("等待區塊確認並刷新餘額...", { id: toastId });
                
                // 等待 10 秒後刷新，給 Railgun 掃描器足夠時間
                setTimeout(async () => {
                    try {
                        console.log("🔄 開始刷新 Railgun 餘額...");
                        await refresh();
                        console.log("✅ 餘額刷新完成");
                        
                        // 再等待 5 秒後再次刷新，確保 LP Token 被掃描到
                        setTimeout(async () => {
                            try {
                                console.log("🔄 第二次刷新 Railgun 餘額...");
                                await refresh();
                                toast.success("餘額已更新！LP Token 應該已顯示在您的隱私池中。如果沒有，請手動刷新。", { id: toastId });
                            } catch (error) {
                                console.error("第二次刷新餘額失敗:", error);
                            }
                        }, 5000);
                    } catch (error) {
                        console.error("刷新餘額失敗:", error);
                        toast.error("交易成功，但刷新餘額失敗。請手動刷新。", { id: toastId });
                    }
                }, 10000); // 等待 10 秒後刷新
        } catch (error: any) {
            console.error(error);
            toast.error(CONTENT.ERRORS.TX_FAILED + (error.reason || error.message), { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const executeRemoveLiquidityTx = async ({
        tokenA,
        tokenB,
        liquidity,
    }: {
        tokenA: string;
        tokenB: string;
        liquidity: string;
    }) => {
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

        setIsLoadingRemove(true);
        const toastId = toast.loading(CONTENT.TOASTS.PREPARING_TX);
        setTxHashRemove("");

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

            // 6. 驗證 LP Token 金額
            if (!liquidity || parseFloat(liquidity) <= 0) {
                toast.error("請輸入有效的 LP Token 金額", { id: toastId });
                return;
            }

            // 7. 獲取 LP Token decimals（通常是 18）
            if (!signer?.provider) {
                toast.error("無法獲取 Provider", { id: toastId });
                return;
            }

            // 獲取 LP Token 地址
            const { getPairAddress } = await import("@/lib/railgun/uniswap-pools");
            const lpTokenAddress = await getPairAddress(tokenA, tokenB, signer.provider);
            
            if (lpTokenAddress === ZeroAddress) {
                toast.error("池子不存在", { id: toastId });
                return;
            }

            const lpTokenDecimals = 18; // LP Token 通常是 18 decimals
            const liquidityBigInt = parseUnits(liquidity, lpTokenDecimals);

            // 8. 計算滑點保護（5% 滑點）
            // 根據當前池子儲備量計算預期可提取的代幣數量
            const { getPoolInfo } = await import("@/lib/railgun/uniswap-pools");
            const poolInfo = await getPoolInfo(tokenA, tokenB, signer.provider);
            
            if (!poolInfo) {
                toast.error("無法獲取池子信息", { id: toastId });
                return;
            }

            // 計算預期可提取的代幣數量（考慮 unshield fee）
            const unshieldFeeBasisPoints = CONFIG.FEES.UNSHIELD_BASIS_POINTS;
            const liquidityAfterFee = (liquidityBigInt * (10000n - unshieldFeeBasisPoints)) / 10000n;
            const userShareAfterFee = poolInfo.totalSupply > 0n
                ? (liquidityAfterFee * 10000n) / poolInfo.totalSupply
                : 0n;

            // 獲取代幣 decimals
            const decimalsA = await getTokenDecimals(tokenA, signer.provider);
            const decimalsB = await getTokenDecimals(tokenB, signer.provider);

            // 計算預期可提取的代幣數量（扣除手續費後）
            const expectedAmountA = (poolInfo.reserve0 * userShareAfterFee) / 10000n;
            const expectedAmountB = (poolInfo.reserve1 * userShareAfterFee) / 10000n;

            // 計算最小金額（5% 滑點保護）
            const slippageBps = 500; // 5% = 500 basis points
            const amountAMin = (expectedAmountA * BigInt(10000 - slippageBps)) / 10000n;
            const amountBMin = (expectedAmountB * BigInt(10000 - slippageBps)) / 10000n;

            toast.loading(CONTENT.TOASTS.GENERATING_PROOF, { id: toastId });

            let txResponse;

            if (isZetachain) {
                // 在 Zetachain 上直接執行
                txResponse = await executeRemoveLiquidity(
                    walletId,
                    tokenA,
                    tokenB,
                    liquidityBigInt,
                    amountAMin,
                    amountBMin,
                    encryptionKey,
                    signer,
                    true, // shouldShieldTokens - 啟用代幣 Shield 回 Railgun 隱私池
                    railgunAddress
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

                txResponse = await executeRemoveLiquidityFromEvm(
                    walletId,
                    tokenA,
                    tokenB,
                    liquidityBigInt,
                    amountAMin,
                    amountBMin,
                    encryptionKey,
                    signer,
                    currentChainKey,
                    true, // shouldShieldTokens - 啟用代幣 Shield 回 Railgun 隱私池
                    railgunAddress
                );
            }

            toast.loading(CONTENT.TOASTS.TX_SUBMITTED, { id: toastId });
            setTxHashRemove(txResponse.hash);
            toast.success(CONTENT.TOASTS.TX_SUBMITTED, { id: toastId });
            
            // 等待交易確認後，自動刷新 Railgun 餘額
            toast.loading("等待交易確認...", { id: toastId });
            const receipt = await txResponse.wait();
            console.log("✅ 交易確認:", receipt);
            
            toast.loading("等待區塊確認並刷新餘額...", { id: toastId });
            
            setTimeout(async () => {
                try {
                    console.log("🔄 開始刷新 Railgun 餘額...");
                    await refresh();
                    console.log("✅ 餘額刷新完成");
                    
                    setTimeout(async () => {
                        try {
                            console.log("🔄 第二次刷新 Railgun 餘額...");
                            await refresh();
                            toast.success("餘額已更新！代幣應該已顯示在您的隱私池中。如果沒有，請手動刷新。", { id: toastId });
                        } catch (error) {
                            console.error("第二次刷新餘額失敗:", error);
                        }
                    }, 5000);
                } catch (error) {
                    console.error("刷新餘額失敗:", error);
                    toast.error("交易成功，但刷新餘額失敗。請手動刷新。", { id: toastId });
                }
            }, 10000);
        } catch (error: any) {
            console.error(error);
            toast.error(CONTENT.ERRORS.TX_FAILED + (error.reason || error.message), { id: toastId });
        } finally {
            setIsLoadingRemove(false);
        }
    };

    return {
        executeAddLiquidity: executeAddLiquidityTx,
        executeRemoveLiquidity: executeRemoveLiquidityTx,
        isLoading,
        isLoadingRemove,
        txHash,
        txHashRemove,
    };
};

