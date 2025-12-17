import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@repo/ui/components/button";
import { CONFIG } from "@/config/env";
import { ZeroAddress, formatUnits, parseUnits, JsonRpcProvider } from "ethers";
import { getTokenLogoUrl, getTokenSymbol, getAllConfiguredTokens } from "@/lib/railgun/token-utils";
import { useWallet } from "@/components/providers/wallet-provider";
import { getCommonTokenPairs, getPoolsInfo, type PoolInfo } from "@/lib/railgun/uniswap-pools";
import { getCachedPools, setCachedPools } from "@/lib/railgun/pools-cache";

type Stage = "category" | "pool-selection" | "liquidity-management";

interface LiquidityFormProps {
    selectedChain: string;
    railgunAddress: string;
    balances: any;
    handleAddLiquidity: () => void;
    isLoading: boolean;
    isLoadingRemove: boolean;
    executeAddLiquidity: (params: {
        tokenA: string;
        tokenB: string;
        amountA: string;
        amountB: string;
    }) => Promise<void>;
    executeRemoveLiquidity: (params: {
        tokenA: string;
        tokenB: string;
        liquidity: string;
    }) => Promise<void>;
    onRefresh?: () => Promise<void>; // 可選的刷新函數
}

export function LiquidityForm({
    selectedChain,
    railgunAddress,
    balances,
    handleAddLiquidity,
    isLoading,
    isLoadingRemove,
    executeAddLiquidity,
    executeRemoveLiquidity,
    onRefresh,
}: LiquidityFormProps) {
    const { signer } = useWallet();

    // 狀態：當前階段
    const [currentStage, setCurrentStage] = useState<Stage>("category");
    
    // 狀態：選中的池子
    const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
    
    // 狀態：池子列表
    const [pools, setPools] = useState<PoolInfo[]>([]);
    const [isLoadingPools, setIsLoadingPools] = useState(false);
    
    // 狀態：當前操作模式（添加或移除流動性）
    const [activeTab, setActiveTab] = useState<"add" | "remove">("add");

    // 獲取有餘額的代幣列表（帶餘額信息）
    const tokensWithBalance = useMemo(() => {
        if (!balances?.erc20Amounts) return [];
        
        return balances.erc20Amounts
            .filter((token: any) => token.amount > 0n)
            .map((token: any) => ({
                address: token.tokenAddress,
                symbol: getTokenSymbol(token.tokenAddress),
                logoUrl: getTokenLogoUrl(token.tokenAddress),
                balance: token.amount,
                decimals: CONFIG.TOKENS[getTokenSymbol(token.tokenAddress) as keyof typeof CONFIG.TOKENS]?.decimals || 18,
            }))
            .sort((a: any, b: any) => {
                // 按餘額排序（從大到小）
                if (b.balance > a.balance) return 1;
                if (b.balance < a.balance) return -1;
                return 0;
            });
    }, [balances]);

    // 所有配置的代幣（用於選擇，優先顯示有餘額的）
    const allTokens = useMemo(() => {
        const configured = getAllConfiguredTokens();
        const withBalanceAddresses = new Set(tokensWithBalance.map((t: any) => t.address.toLowerCase()));
        
        // 將有餘額的代幣放在前面
        return [
            ...tokensWithBalance.map((t: any) => ({
                address: t.address,
                symbol: t.symbol,
                logoUrl: t.logoUrl,
                hasBalance: true,
                balance: t.balance,
                decimals: t.decimals,
            })),
            ...configured
                .filter(t => !withBalanceAddresses.has(t.address.toLowerCase()))
                .map(t => ({
                    ...t,
                    hasBalance: false,
                    balance: 0n,
                    decimals: t.decimals || 18,
                })),
        ];
    }, [tokensWithBalance]);

    // 狀態：代幣對選擇
    const [tokenA, setTokenA] = useState<string>(ZeroAddress);
    const [tokenB, setTokenB] = useState<string>(ZeroAddress);
    const [amountA, setAmountA] = useState("0.01");
    const [amountB, setAmountB] = useState("0.01");
    const [amountLiquidity, setAmountLiquidity] = useState("");

    // DeFi 類別選項（第一階段）
    const defiCategories = [
        {
            value: "liquidity" as const,
            label: "流動性管理 (Liquidity Management)",
            description: "添加或移除流動性",
            available: true,
        },
    ];


    // 獲取代幣餘額（格式化）
    const getTokenBalance = (tokenAddr: string): string => {
        const token = tokensWithBalance.find((t: any) => 
            t.address.toLowerCase() === tokenAddr.toLowerCase()
        );
        if (!token) return "0";
        try {
            return formatUnits(token.balance, token.decimals);
        } catch {
            return token.balance.toString();
        }
    };

    // 獲取代幣信息
    const getTokenInfo = (tokenAddr: string) => {
        const token = allTokens.find(t => t.address.toLowerCase() === tokenAddr.toLowerCase());
        return token || {
            address: tokenAddr,
            symbol: getTokenSymbol(tokenAddr),
            logoUrl: getTokenLogoUrl(tokenAddr),
            hasBalance: false,
            balance: 0n,
            decimals: 18,
        };
    };

    // Lazy loading 池子列表（只在進入池子選擇階段且需要時加載）
    useEffect(() => {
        const loadPools = async () => {
            // 只在進入池子選擇階段時才加載
            if (currentStage !== "pool-selection") {
                return;
            }

            // 如果已經有池子數據，不需要重新加載
            if (pools.length > 0) {
                return;
            }

            setIsLoadingPools(true);
            try {
                // 重要：池子查詢始終在 ZetaChain 上進行，因為所有 ZRC-20 代幣都在 ZetaChain 上
                // 無論當前連接到哪個鏈，都使用 ZetaChain 的 provider
                const zetachainProvider = new JsonRpcProvider(CONFIG.RAILGUN_NETWORK.RPC_URL);
                const zetachainChainId = CONFIG.RAILGUN_NETWORK.CHAIN_ID;

                // 1. 先檢查快取（使用 ZetaChain 的鏈 ID）
                const cachedPools = getCachedPools(zetachainChainId);
                if (cachedPools && cachedPools.length > 0) {
                    setPools(cachedPools);
                    setIsLoadingPools(false);
                    return;
                }

                // 2. 快取未命中，從 ZetaChain 查詢
                const commonPairs = getCommonTokenPairs();
                const poolsInfo = await getPoolsInfo(commonPairs, zetachainProvider);
                
                // 3. 保存到快取（使用 ZetaChain 的鏈 ID）
                if (poolsInfo.length > 0) {
                    setCachedPools(zetachainChainId, poolsInfo);
                }
                
                setPools(poolsInfo);
            } catch (error) {
                console.error("Failed to load pools:", error);
            } finally {
                setIsLoadingPools(false);
            }
        };

        loadPools();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStage]);

    // 移除代幣選擇相關的 useEffect（選擇池子後代幣已確定，不需要下拉選單）

    const tokenAInfo = getTokenInfo(tokenA);
    const tokenBInfo = getTokenInfo(tokenB);
    const tokenABalance = getTokenBalance(tokenA);
    const tokenBBalance = getTokenBalance(tokenB);

    // 獲取用戶的 LP Token 餘額
    const userLPTokenBalance = useMemo(() => {
        if (!selectedPool || !balances?.erc20Amounts) {
            console.log("🔍 LP Token 查詢: 缺少 selectedPool 或 balances", {
                hasSelectedPool: !!selectedPool,
                hasBalances: !!balances,
                hasErc20Amounts: !!balances?.erc20Amounts,
                balanceBucket: balances?.balanceBucket,
            });
            return null;
        }
        
        // 檢查 balanceBucket 是否為 "Spendable"
        if (balances.balanceBucket !== "Spendable") {
            console.log("⚠️ 餘額不是 Spendable，當前 balanceBucket:", balances.balanceBucket);
            // 即使不是 Spendable，我們也嘗試查找，因為可能還在 ShieldPending
        }
        
        const pairAddressLower = selectedPool.pairAddress.toLowerCase();
        console.log("🔍 查詢 LP Token:", {
            pairAddress: selectedPool.pairAddress,
            pairAddressLower,
            balanceBucket: balances.balanceBucket,
            allTokens: balances.erc20Amounts.map((t: any) => ({
                address: t.tokenAddress,
                addressLower: t.tokenAddress.toLowerCase(),
                amount: t.amount.toString(),
            })),
        });
        
        const lpToken = balances.erc20Amounts.find(
            (token: any) => token.tokenAddress.toLowerCase() === pairAddressLower
        );
        
        if (!lpToken) {
            console.log("⚠️ 未找到 LP Token 在餘額中", {
                searchedAddress: pairAddressLower,
                availableAddresses: balances.erc20Amounts.map((t: any) => t.tokenAddress.toLowerCase()),
            });
            return null;
        }
        
        if (lpToken.amount === 0n) {
            console.log("⚠️ LP Token 餘額為 0");
            return null;
        }
        
        console.log("✅ 找到 LP Token:", {
            address: lpToken.tokenAddress,
            amount: lpToken.amount.toString(),
            balanceBucket: balances.balanceBucket,
        });
        
        // LP Token 通常是 18 decimals
        const decimals = 18;
        return formatUnits(lpToken.amount, decimals);
    }, [selectedPool, balances]);

    // 獲取用戶 LP Token 的原始 bigint 值（用於精確驗證）
    const userLPTokenBalanceBigInt = useMemo(() => {
        if (!selectedPool || !balances?.erc20Amounts) {
            return null;
        }
        
        const pairAddressLower = selectedPool.pairAddress.toLowerCase();
        const lpToken = balances.erc20Amounts.find(
            (token: any) => token.tokenAddress.toLowerCase() === pairAddressLower
        );
        
        if (!lpToken || lpToken.amount === 0n) {
            return null;
        }
        
        return lpToken.amount;
    }, [selectedPool, balances]);

    // 計算池子狀態信息
    const poolStats = useMemo(() => {
        if (!selectedPool) return null;

        const reserve0Formatted = formatUnits(selectedPool.reserve0, tokenAInfo.decimals || 18);
        const reserve1Formatted = formatUnits(selectedPool.reserve1, tokenBInfo.decimals || 18);
        const totalSupplyFormatted = formatUnits(selectedPool.totalSupply, 18); // LP Token 通常是 18 decimals

        // 計算用戶在池子中的份額（如果有 LP token）
        let userShare = null;
        let userToken0Amount = null;
        let userToken1Amount = null;
        
        if (userLPTokenBalance) {
            const userLP = parseFloat(userLPTokenBalance);
            const totalLP = parseFloat(totalSupplyFormatted);
            userShare = totalLP > 0 ? (userLP / totalLP) * 100 : 0;
            
            // 計算用戶可以提取的代幣數量
            if (userShare > 0) {
                userToken0Amount = (parseFloat(reserve0Formatted) * userShare / 100).toFixed(6);
                userToken1Amount = (parseFloat(reserve1Formatted) * userShare / 100).toFixed(6);
            }
        }

        // 計算當前價格（1 token0 = ? token1）
        // 價格 = reserve1 / reserve0（考慮 decimals）
        const reserve0Num = parseFloat(reserve0Formatted);
        const reserve1Num = parseFloat(reserve1Formatted);
        const currentPrice = reserve0Num > 0 ? reserve1Num / reserve0Num : 0;

        return {
            reserve0: reserve0Formatted,
            reserve1: reserve1Formatted,
            totalSupply: totalSupplyFormatted,
            userLPTokenBalance,
            userShare,
            userToken0Amount,
            userToken1Amount,
            currentPrice,
        };
    }, [selectedPool, tokenAInfo.decimals, tokenBInfo.decimals, userLPTokenBalance]);

    // 追蹤最後更新的輸入框，避免循環更新
    const lastUpdatedRef = useRef<"A" | "B" | null>(null);

    // 自動計算始終啟用（強制執行常數乘積公式）
    // 當 amountA 改變時，自動計算 amountB
    useEffect(() => {
        if (!selectedPool || !poolStats?.currentPrice) return;
        if (lastUpdatedRef.current === "B") {
            // 如果剛剛更新了 B，重置標記，不觸發 A 的更新
            lastUpdatedRef.current = null;
            return;
        }
        
        const amountANum = parseFloat(amountA);
        if (isNaN(amountANum) || amountANum <= 0) {
            if (amountA === "" || amountA === "0") {
                setAmountB("0");
            }
            return;
        }

        // 根據當前價格計算：amountB = amountA × currentPrice
        const calculatedB = (amountANum * poolStats.currentPrice).toFixed(6);
        
        // 避免循環更新：只在值不同時更新
        if (Math.abs(parseFloat(calculatedB) - parseFloat(amountB)) > 0.000001) {
            lastUpdatedRef.current = "A";
            setAmountB(calculatedB);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [amountA, selectedPool, poolStats?.currentPrice]);

    // 當 amountB 改變時，自動計算 amountA
    useEffect(() => {
        if (!selectedPool || !poolStats?.currentPrice) return;
        if (lastUpdatedRef.current === "A") {
            // 如果剛剛更新了 A，重置標記，不觸發 B 的更新
            lastUpdatedRef.current = null;
            return;
        }
        
        const amountBNum = parseFloat(amountB);
        if (isNaN(amountBNum) || amountBNum <= 0) {
            if (amountB === "" || amountB === "0") {
                setAmountA("0");
            }
            return;
        }

        // 根據當前價格計算：amountA = amountB / currentPrice
        const calculatedA = (amountBNum / poolStats.currentPrice).toFixed(6);
        
        // 避免循環更新：只在值不同時更新
        if (Math.abs(parseFloat(calculatedA) - parseFloat(amountA)) > 0.000001) {
            lastUpdatedRef.current = "B";
            setAmountA(calculatedA);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [amountB, selectedPool, poolStats?.currentPrice]);

    return (
        <div className="space-y-6">
            {/* 第一階段：DeFi 類別選擇 */}
            {currentStage === "category" && (
                <>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">DeFi 操作 (DeFi Operations)</h2>
                        <p className="text-gray-600 text-sm">
                            選擇要使用的 DeFi 功能
                        </p>
                    </div>

                    {/* DeFi 類別選擇 */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold">選擇 DeFi 功能 (Select DeFi Function)</label>
                        <div className="space-y-2">
                            {defiCategories.map((category) => (
                                <button
                                    key={category.value}
                                    type="button"
                                    onClick={() => {
                                        if (category.available && category.value === "liquidity") {
                                            // 直接進入池子選擇階段
                                            setCurrentStage("pool-selection");
                                        }
                                    }}
                                    className="w-full text-left p-4 border-2 border-black rounded-lg transition-all bg-white hover:bg-gray-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="font-bold text-lg">{category.label}</div>
                                            {category.description && (
                                                <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                                            )}
                                        </div>
                                        <span className="text-gray-400 ml-2">→</span>
                                    </div>
                                </button>
                            ))}
                            {/* 其他功能 Coming Soon */}
                            <div className="w-full p-4 border-2 border-black bg-white rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                                <span className="text-sm bg-yellow-100 text-yellow-800 px-4 py-2 rounded font-bold">
                                    Coming Soon
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}


            {/* 第二階段：池子選擇 */}
            {currentStage === "pool-selection" && (
                <div className="space-y-6">
                    {/* 返回按鈕 */}
                    <button
                        type="button"
                        onClick={() => setCurrentStage("category")}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-colors mb-2"
                    >
                        <span>←</span>
                        <span>返回</span>
                    </button>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">選擇流動性池 (Select Pool)</h2>
                        <p className="text-gray-600 text-sm">
                            選擇要添加流動性的池子
                        </p>
                    </div>

                    {isLoadingPools ? (
                        <div className="text-center p-8">
                            <div className="text-gray-500">正在加載池子列表...</div>
                        </div>
                    ) : pools.length === 0 ? (
                        <div className="text-center p-8 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                            <h3 className="text-lg font-bold mb-2">⚠️ 未找到可用池子</h3>
                            <p className="text-gray-600 text-sm">
                                目前沒有可用的流動性池，請先創建池子
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <label className="text-sm font-bold">可用池子 (Available Pools)</label>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {pools.map((pool) => (
                                    <button
                                        key={pool.pairAddress}
                                        type="button"
                                        onClick={() => {
                                            setSelectedPool(pool);
                                            // 根據池子中的 token0 和 token1 設置 tokenA 和 tokenB
                                            // 注意：需要確保順序正確
                                            setTokenA(pool.token0);
                                            setTokenB(pool.token1);
                                            // 選完池子後，直接進入統整的流動性管理畫面
                                            setCurrentStage("liquidity-management");
                                            setActiveTab("add"); // 默認顯示添加流動性
                                        }}
                                        className="w-full text-left p-4 border-2 border-black rounded-lg transition-all bg-white hover:bg-gray-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                {/* Token 0 */}
                                                <div className="flex items-center gap-2">
                                                    {pool.token0LogoUrl && (
                                                        <img
                                                            src={pool.token0LogoUrl}
                                                            alt={pool.token0Symbol}
                                                            className="w-8 h-8 rounded-full"
                                                        />
                                                    )}
                                                    <span className="font-bold">{pool.token0Symbol}</span>
                                                </div>
                                                <span className="text-gray-400">/</span>
                                                {/* Token 1 */}
                                                <div className="flex items-center gap-2">
                                                    {pool.token1LogoUrl && (
                                                        <img
                                                            src={pool.token1LogoUrl}
                                                            alt={pool.token1Symbol}
                                                            className="w-8 h-8 rounded-full"
                                                        />
                                                    )}
                                                    <span className="font-bold">{pool.token1Symbol}</span>
                                                </div>
                                            </div>
                                            <span className="text-gray-400 ml-2">→</span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500">
                                            池子地址: {pool.pairAddress.slice(0, 6)}...{pool.pairAddress.slice(-4)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 統整的流動性管理畫面 */}
            {currentStage === "liquidity-management" && selectedPool && (
                <div className="space-y-6">
                    {/* 返回按鈕 */}
                    <button
                        type="button"
                        onClick={() => setCurrentStage("pool-selection")}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-colors mb-2"
                    >
                        <span>←</span>
                        <span>返回選擇池子</span>
                    </button>

                    {/* 池子信息 */}
                    {selectedPool && (
                        <div className="p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <div className="text-xs font-bold mb-3 text-gray-600 uppercase tracking-wide">選中的池子 (Selected Pool)</div>
                            <div className="flex items-center gap-3">
                                {selectedPool.token0LogoUrl && (
                                    <img src={selectedPool.token0LogoUrl} alt={selectedPool.token0Symbol} className="w-8 h-8 rounded-full" />
                                )}
                                <span className="font-bold text-lg">{selectedPool.token0Symbol}</span>
                                <span className="text-gray-400 text-xl">/</span>
                                {selectedPool.token1LogoUrl && (
                                    <img src={selectedPool.token1LogoUrl} alt={selectedPool.token1Symbol} className="w-8 h-8 rounded-full" />
                                )}
                                <span className="font-bold text-lg">{selectedPool.token1Symbol}</span>
                            </div>
                        </div>
                    )}

                    {/* LP Position 顯示 */}
                    {poolStats && poolStats.userLPTokenBalance && parseFloat(poolStats.userLPTokenBalance) > 0 && (
                        <div className="p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">您的流動性位置 (Your LP Position)</div>
                                {onRefresh && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                await onRefresh();
                                            } catch (error) {
                                                console.error("刷新失敗:", error);
                                            }
                                        }}
                                        className="text-xs font-bold text-gray-600 hover:text-black underline"
                                    >
                                        刷新餘額
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">LP Token 餘額:</span>
                                    <span className="font-bold text-lg text-black">
                                        {parseFloat(poolStats.userLPTokenBalance).toFixed(6)} LP
                                    </span>
                                </div>
                                {poolStats.userShare !== null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">池子份額:</span>
                                        <span className="font-bold text-black">
                                            {poolStats.userShare.toFixed(4)}%
                                        </span>
                                    </div>
                                )}
                                {poolStats.userToken0Amount && poolStats.userToken1Amount && (
                                    <div className="pt-3 border-t border-gray-200">
                                        <div className="text-xs font-bold text-gray-600 mb-2">可提取代幣:</div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    {selectedPool.token0LogoUrl && (
                                                        <img src={selectedPool.token0LogoUrl} alt={selectedPool.token0Symbol} className="w-4 h-4 rounded-full" />
                                                    )}
                                                    <span className="text-sm text-gray-700">{selectedPool.token0Symbol}:</span>
                                                </div>
                                                <span className="font-bold text-sm text-black">
                                                    {poolStats.userToken0Amount}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    {selectedPool.token1LogoUrl && (
                                                        <img src={selectedPool.token1LogoUrl} alt={selectedPool.token1Symbol} className="w-4 h-4 rounded-full" />
                                                    )}
                                                    <span className="text-sm text-gray-700">{selectedPool.token1Symbol}:</span>
                                                </div>
                                                <span className="font-bold text-sm text-black">
                                                    {poolStats.userToken1Amount}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 切換 */}
                    <div className="flex gap-2 border-b-2 border-black">
                        <button
                            type="button"
                            onClick={() => setActiveTab("add")}
                            className={`flex-1 py-3 font-bold transition-all ${
                                activeTab === "add"
                                    ? "bg-black text-white border-b-4 border-black"
                                    : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            添加流動性 (Add Liquidity)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("remove")}
                            className={`flex-1 py-3 font-bold transition-all ${
                                activeTab === "remove"
                                    ? "bg-black text-white border-b-4 border-black"
                                    : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            移除流動性 (Remove Liquidity)
                        </button>
                    </div>

                    {/* 添加流動性表單 */}
                    {activeTab === "add" && (
                        <>
                            {/* 主要輸入區域 - 垂直布局，突出顯示 */}
                            <div className="space-y-4">
                                {/* 價格顯示 - 移到上方 */}
                                {poolStats && poolStats.currentPrice > 0 && selectedPool && (
                                    <div className="bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-3 mb-2">
                                        <div className="text-center space-y-2">
                                            {/* 主要價格顯示 */}
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    {selectedPool.token0LogoUrl && (
                                                        <img 
                                                            src={selectedPool.token0LogoUrl} 
                                                            alt={selectedPool.token0Symbol} 
                                                            className="w-4 h-4 rounded-full"
                                                        />
                                                    )}
                                                    <span className="text-sm font-bold">1 {selectedPool.token0Symbol}</span>
                                                </div>
                                                <span className="text-gray-400">=</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold text-purple-600">{poolStats.currentPrice.toFixed(6)}</span>
                                                    {selectedPool.token1LogoUrl && (
                                                        <img 
                                                            src={selectedPool.token1LogoUrl} 
                                                            alt={selectedPool.token1Symbol} 
                                                            className="w-4 h-4 rounded-full"
                                                        />
                                                    )}
                                                    <span className="text-sm font-bold">{selectedPool.token1Symbol}</span>
                                                </div>
                                            </div>
                                            
                                            {/* 反向價格（較小字體，次要信息） */}
                                            <div className="text-xs text-gray-500">
                                                1 {selectedPool.token1Symbol} = {(1 / poolStats.currentPrice).toFixed(6)} {selectedPool.token0Symbol}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 代幣 A 輸入 */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {tokenAInfo.logoUrl && (
                                                <img 
                                                    src={tokenAInfo.logoUrl} 
                                                    alt="Token A"
                                                    className="w-6 h-6 rounded-full"
                                                />
                                            )}
                                            <label className="font-bold text-lg">{tokenAInfo.symbol || "Token A"}</label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">
                                                餘額: {parseFloat(tokenABalance).toFixed(6)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setAmountA(tokenABalance)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                                            >
                                                MAX
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="any"
                                            value={amountA}
                                            onChange={(e) => setAmountA(e.target.value)}
                                            placeholder="0.0"
                                            className="w-full p-5 border-2 border-black rounded-xl text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20 bg-white"
                                        />
                                    </div>
                                </div>

                                {/* "+" 圖標 - 在兩個輸入框之間 */}
                                <div className="flex items-center justify-center py-1">
                                    <div className="w-8 h-8 rounded-full bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                                        <span className="text-lg font-bold">+</span>
                                    </div>
                                </div>

                                {/* 代幣 B 輸入 */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {tokenBInfo.logoUrl && (
                                                <img 
                                                    src={tokenBInfo.logoUrl} 
                                                    alt="Token B"
                                                    className="w-6 h-6 rounded-full"
                                                />
                                            )}
                                            <label className="font-bold text-lg">{tokenBInfo.symbol || "Token B"}</label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">
                                                餘額: {parseFloat(tokenBBalance).toFixed(6)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setAmountB(tokenBBalance)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                                            >
                                                MAX
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="any"
                                            value={amountB}
                                            onChange={(e) => setAmountB(e.target.value)}
                                            placeholder="0.0"
                                            className="w-full p-5 border-2 border-black rounded-xl text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 發送按鈕 */}
                            <Button
                                onClick={async () => {
                                    if (!tokenA || !tokenB || !amountA || !amountB) {
                                        return;
                                    }
                                    try {
                                        await executeAddLiquidity({
                                            tokenA,
                                            tokenB,
                                            amountA,
                                            amountB,
                                        });
                                    } catch (error) {
                                        console.error("Add Liquidity failed:", error);
                                    }
                                }}
                                disabled={isLoading || !tokenA || !tokenB || !amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0}
                                className="w-full py-6 text-xl font-bold bg-black text-white hover:bg-gray-800 border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? "處理中..." : "添加流動性 (Add Liquidity)"}
                            </Button>
                        </>
                    )}

                    {/* 移除流動性表單 */}
                    {activeTab === "remove" && (
                        <div className="space-y-6">
                            {poolStats && poolStats.userLPTokenBalance && parseFloat(poolStats.userLPTokenBalance) > 0 ? (
                                <div className="bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-6">
                                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">移除流動性</div>
                                    
                                    {/* LP Token 輸入 */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-bold text-gray-700">LP Token 數量</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">
                                                    餘額: {parseFloat(poolStats.userLPTokenBalance).toFixed(6)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        // 直接使用格式化後的字符串值，避免浮點數精度問題
                                                        if (poolStats.userLPTokenBalance) {
                                                            setAmountLiquidity(poolStats.userLPTokenBalance);
                                                        }
                                                    }}
                                                    className="text-xs font-bold text-gray-600 hover:text-black underline"
                                                >
                                                    MAX
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            value={amountLiquidity}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // 如果輸入的值超過餘額，自動限制為餘額（使用 bigint 精確比較）
                                                if (userLPTokenBalanceBigInt && value) {
                                                    try {
                                                        const inputBigInt = parseUnits(value, 18);
                                                        if (inputBigInt > userLPTokenBalanceBigInt) {
                                                            // 使用原始餘額的格式化字符串
                                                            setAmountLiquidity(poolStats.userLPTokenBalance || "");
                                                        } else {
                                                            setAmountLiquidity(value);
                                                        }
                                                    } catch {
                                                        // 如果解析失敗，允許輸入（讓用戶繼續輸入）
                                                        setAmountLiquidity(value);
                                                    }
                                                } else {
                                                    setAmountLiquidity(value);
                                                }
                                            }}
                                            placeholder="0.0"
                                            min="0"
                                            max={poolStats.userLPTokenBalance ? parseFloat(poolStats.userLPTokenBalance) : undefined}
                                            step="0.000001"
                                            className="w-full p-5 border-2 border-black rounded-xl text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20 bg-white"
                                        />
                                    </div>

                                    {/* 預期可提取的代幣數量 */}
                                    {amountLiquidity && parseFloat(amountLiquidity) > 0 && poolStats && (
                                        <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg mb-4">
                                            <div className="text-xs font-bold text-gray-600 mb-2">預期可提取:</div>
                                            <div className="space-y-2">
                                                {poolStats.userToken0Amount && poolStats.userToken1Amount && (
                                                    <>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {selectedPool?.token0LogoUrl && (
                                                                    <img src={selectedPool.token0LogoUrl} alt={selectedPool.token0Symbol} className="w-5 h-5 rounded-full" />
                                                                )}
                                                                <span className="text-sm text-gray-700">{selectedPool?.token0Symbol}:</span>
                                                            </div>
                                                            <span className="font-bold text-sm">
                                                                {((parseFloat(poolStats.userToken0Amount) * parseFloat(amountLiquidity)) / parseFloat(poolStats.userLPTokenBalance)).toFixed(6)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {selectedPool?.token1LogoUrl && (
                                                                    <img src={selectedPool.token1LogoUrl} alt={selectedPool.token1Symbol} className="w-5 h-5 rounded-full" />
                                                                )}
                                                                <span className="text-sm text-gray-700">{selectedPool?.token1Symbol}:</span>
                                                            </div>
                                                            <span className="font-bold text-sm">
                                                                {((parseFloat(poolStats.userToken1Amount) * parseFloat(amountLiquidity)) / parseFloat(poolStats.userLPTokenBalance)).toFixed(6)}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* 提交按鈕 */}
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!selectedPool || !amountLiquidity || parseFloat(amountLiquidity) <= 0) {
                                                return;
                                            }
                                            
                                            // 使用 bigint 精確驗證，避免浮點數精度問題
                                            if (userLPTokenBalanceBigInt && amountLiquidity) {
                                                try {
                                                    const inputBigInt = parseUnits(amountLiquidity, 18);
                                                    if (inputBigInt > userLPTokenBalanceBigInt) {
                                                        alert("LP Token 數量不能超過您的餘額");
                                                        return;
                                                    }
                                                } catch (error) {
                                                    alert("請輸入有效的 LP Token 數量");
                                                    return;
                                                }
                                            }

                                            await executeRemoveLiquidity({
                                                tokenA: selectedPool.token0,
                                                tokenB: selectedPool.token1,
                                                liquidity: amountLiquidity,
                                            });
                                        }}
                                        disabled={(() => {
                                            if (isLoadingRemove || !amountLiquidity || !userLPTokenBalanceBigInt) return true;
                                            try {
                                                const inputBigInt = parseUnits(amountLiquidity, 18);
                                                return inputBigInt <= 0n || inputBigInt > userLPTokenBalanceBigInt;
                                            } catch {
                                                return true;
                                            }
                                        })()}
                                        className="w-full py-6 text-xl font-bold bg-black text-white hover:bg-gray-800 border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoadingRemove ? "處理中..." : "移除流動性"}
                                    </button>
                                </div>
                            ) : (
                                <div className="p-8 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center">
                                    <div className="text-4xl mb-4">💧</div>
                                    <h3 className="text-xl font-bold mb-2">沒有流動性</h3>
                                    <p className="text-gray-600 mb-4">
                                        您目前在這個池子中沒有 LP Token。請先添加流動性。
                                    </p>
                                    {balances && balances.balanceBucket !== "Spendable" && (
                                        <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                            <p className="text-xs text-blue-800">
                                                💡 提示：您的 LP Token 可能還在 {balances.balanceBucket} 狀態。請等待 Shield 完成後再查看。
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 池子狀態信息 - 移到底部，視覺上次要化（可折疊） */}
                    {selectedPool && poolStats && (
                        <details className="mt-6">
                            <summary className="cursor-pointer text-sm font-bold text-gray-500 hover:text-gray-700 pb-2 border-b border-gray-200">
                                池子詳情 (Pool Details)
                            </summary>
                            <div className="mt-4 p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-3 text-sm">
                                {/* 儲備量 */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">儲備量 (Reserves)</div>
                                        <div className="flex items-center gap-2">
                                            {selectedPool.token0LogoUrl && (
                                                <img src={selectedPool.token0LogoUrl} alt={selectedPool.token0Symbol} className="w-4 h-4 rounded-full" />
                                            )}
                                            <span className="font-bold text-xs">
                                                {parseFloat(poolStats.reserve0).toFixed(4)} {selectedPool.token0Symbol}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">儲備量 (Reserves)</div>
                                        <div className="flex items-center gap-2">
                                            {selectedPool.token1LogoUrl && (
                                                <img src={selectedPool.token1LogoUrl} alt={selectedPool.token1Symbol} className="w-4 h-4 rounded-full" />
                                            )}
                                            <span className="font-bold text-xs">
                                                {parseFloat(poolStats.reserve1).toFixed(4)} {selectedPool.token1Symbol}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 總流動性 */}
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">總 LP Token 供應量</div>
                                    <div className="font-bold text-sm">
                                        {parseFloat(poolStats.totalSupply).toFixed(4)} LP
                                    </div>
                                </div>

                                {/* 用戶的 LP Token 餘額 */}
                                {poolStats.userLPTokenBalance && parseFloat(poolStats.userLPTokenBalance) > 0 ? (
                                    <div className="pt-3 border-t border-gray-300">
                                        <div className="text-xs font-bold text-green-700 mb-2">您的流動性</div>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">LP Token:</span>
                                                <span className="font-bold text-green-700">
                                                    {parseFloat(poolStats.userLPTokenBalance).toFixed(6)} LP
                                                </span>
                                            </div>
                                            {poolStats.userShare !== null && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">池子份額:</span>
                                                    <span className="font-bold text-green-700">
                                                        {poolStats.userShare.toFixed(4)}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </details>
                    )}
                </div>
            )}

        </div>
    );
}

