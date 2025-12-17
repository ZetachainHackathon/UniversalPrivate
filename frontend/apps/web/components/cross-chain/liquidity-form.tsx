import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@repo/ui/components/button";
import { CONFIG } from "@/config/env";
import { ZeroAddress, formatUnits } from "ethers";
import { getTokenLogoUrl, getTokenSymbol, getAllConfiguredTokens } from "@/lib/railgun/token-utils";
import { useWallet } from "@/components/providers/wallet-provider";
import { getCommonTokenPairs, getPoolsInfo, type PoolInfo } from "@/lib/railgun/uniswap-pools";
import { getCachedPools, setCachedPools } from "@/lib/railgun/pools-cache";

type LiquidityFunction = "add-liquidity" | "remove-liquidity";
type Stage = "category" | "liquidity" | "pool-selection" | "add-liquidity-form";

interface LiquidityFormProps {
    selectedChain: string;
    railgunAddress: string;
    balances: any;
    handleAddLiquidity: () => void;
    isLoading: boolean;
}

export function LiquidityForm({
    selectedChain,
    railgunAddress,
    balances,
    handleAddLiquidity,
    isLoading,
}: LiquidityFormProps) {
    const { signer } = useWallet();

    // 狀態：當前階段
    const [currentStage, setCurrentStage] = useState<Stage>("category");
    
    // 狀態：選中的池子
    const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
    
    // 狀態：池子列表
    const [pools, setPools] = useState<PoolInfo[]>([]);
    const [isLoadingPools, setIsLoadingPools] = useState(false);

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

    // 狀態：流動性管理功能選擇
    const [liquidityFunction, setLiquidityFunction] = useState<LiquidityFunction>("add-liquidity");

    // 狀態：代幣對選擇
    const [tokenA, setTokenA] = useState<string>(ZeroAddress);
    const [tokenB, setTokenB] = useState<string>(ZeroAddress);
    const [amountA, setAmountA] = useState("0.01");
    const [amountB, setAmountB] = useState("0.01");

    // DeFi 類別選項（第一階段）
    const defiCategories = [
        {
            value: "liquidity" as const,
            label: "流動性管理 (Liquidity Management)",
            description: "添加或移除流動性",
            available: true,
        },
    ];

    // 流動性管理功能選項（第二階段）
    const liquidityOptions = [
        {
            value: "add-liquidity" as LiquidityFunction,
            label: "添加流動性 (Add Liquidity)",
            protocol: "Uniswap V2",
            available: true,
        },
        {
            value: "remove-liquidity" as LiquidityFunction,
            label: "移除流動性 (Remove Liquidity)",
            protocol: "Uniswap V2",
            available: false,
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
            if (currentStage !== "pool-selection" || !signer?.provider) {
                return;
            }

            // 如果已經有池子數據，不需要重新加載
            if (pools.length > 0) {
                return;
            }

            setIsLoadingPools(true);
            try {
                // 獲取當前鏈 ID
                const network = await signer.provider.getNetwork();
                const chainId = Number(network.chainId);

                // 1. 先檢查快取
                const cachedPools = getCachedPools(chainId);
                if (cachedPools && cachedPools.length > 0) {
                    setPools(cachedPools);
                    setIsLoadingPools(false);
                    return;
                }

                // 2. 快取未命中，從鏈上查詢
                const commonPairs = getCommonTokenPairs();
                const poolsInfo = await getPoolsInfo(commonPairs, signer.provider);
                
                // 3. 保存到快取
                if (poolsInfo.length > 0) {
                    setCachedPools(chainId, poolsInfo);
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
    }, [currentStage, signer]);

    // 移除代幣選擇相關的 useEffect（選擇池子後代幣已確定，不需要下拉選單）

    const tokenAInfo = getTokenInfo(tokenA);
    const tokenBInfo = getTokenInfo(tokenB);
    const tokenABalance = getTokenBalance(tokenA);
    const tokenBBalance = getTokenBalance(tokenB);

    // 獲取用戶的 LP Token 餘額
    const userLPTokenBalance = useMemo(() => {
        if (!selectedPool || !balances?.erc20Amounts) return null;
        
        const lpToken = balances.erc20Amounts.find(
            (token: any) => token.tokenAddress.toLowerCase() === selectedPool.pairAddress.toLowerCase()
        );
        
        if (!lpToken || lpToken.amount === 0n) return null;
        
        // LP Token 通常是 18 decimals
        const decimals = 18;
        return formatUnits(lpToken.amount, decimals);
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

            {/* 第三階段：流動性管理操作選擇（選完池子後） */}
            {currentStage === "liquidity" && selectedPool && (
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

                    {/* 顯示選中的池子信息 */}
                    <div className="p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-6">
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

                    {/* 標題 */}
                    <div className="text-center mb-4">
                        <h2 className="text-2xl font-bold mb-2">選擇操作 (Select Operation)</h2>
                        <p className="text-gray-600 text-sm">
                            選擇要對該池子執行的操作
                        </p>
                    </div>

                    {/* 操作選擇 - 改為卡片式按鈕 */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold">流動性操作 (Liquidity Operations)</label>
                        <div className="space-y-2">
                            {liquidityOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        if (option.available) {
                                            setLiquidityFunction(option.value);
                                            if (option.value === "add-liquidity") {
                                                // 選擇添加流動性後，直接進入添加流動性表單
                                                setCurrentStage("add-liquidity-form");
                                            }
                                        }
                                    }}
                                    disabled={!option.available}
                                    className={`w-full text-left p-5 border-2 rounded-lg transition-all ${
                                        option.available
                                            ? "border-black bg-white hover:bg-gray-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                            : "border-black bg-white opacity-50 cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="font-bold text-lg mb-1">{option.label}</div>
                                            <div className="text-xs text-gray-500">{option.protocol}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!option.available && (
                                                <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-bold">
                                                    Coming Soon
                                                </span>
                                            )}
                                            {option.available && (
                                                <span className="text-gray-400 text-xl">→</span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
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
                                            // 選完池子後，進入流動性管理操作選擇階段
                                            setCurrentStage("liquidity");
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

            {/* 根據選擇的功能顯示對應的表單 */}
                {currentStage === "add-liquidity-form" && liquidityFunction === "add-liquidity" && (
                <div className="space-y-6">
                    {/* 返回按鈕 */}
                    <button
                        type="button"
                        onClick={() => setCurrentStage("liquidity")}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-colors mb-2"
                    >
                        <span>←</span>
                        <span>返回</span>
                    </button>

                    {/* 簡化的池子信息（僅顯示代幣對，次要信息） */}
                    {selectedPool && (
                        <div className="mb-4">
                            <div className="p-3 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                                {selectedPool.token0LogoUrl && (
                                    <img src={selectedPool.token0LogoUrl} alt={selectedPool.token0Symbol} className="w-5 h-5 rounded-full" />
                                )}
                                <span className="text-sm font-bold">{selectedPool.token0Symbol}</span>
                                <span className="text-gray-400">/</span>
                                {selectedPool.token1LogoUrl && (
                                    <img src={selectedPool.token1LogoUrl} alt={selectedPool.token1Symbol} className="w-5 h-5 rounded-full" />
                                )}
                                <span className="text-sm font-bold">{selectedPool.token1Symbol}</span>
                            </div>
                        </div>
                    )}

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
                        onClick={handleAddLiquidity}
                        disabled={isLoading || !tokenA || !tokenB || !amountA || !amountB}
                        className="w-full py-6 text-xl font-bold bg-black text-white hover:bg-gray-800 border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "處理中..." : "添加流動性 (Add Liquidity)"}
                    </Button>

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

            {/* 移除流動性顯示 Coming Soon */}
            {currentStage === "liquidity" && liquidityFunction === "remove-liquidity" && (
                <div className="p-8 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center">
                    <div className="text-4xl mb-4">🚧</div>
                    <h3 className="text-xl font-bold mb-2">功能開發中</h3>
                    <p className="text-gray-600">
                        移除流動性 (Remove Liquidity) 功能即將推出
                    </p>
                </div>
            )}
        </div>
    );
}

