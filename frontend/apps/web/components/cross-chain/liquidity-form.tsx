import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@repo/ui/components/button";
import { CONFIG } from "@/config/env";
import { ZeroAddress, formatUnits } from "ethers";
import { getTokenLogoUrl, getTokenSymbol, getAllConfiguredTokens } from "@/lib/railgun/token-utils";
import { useWallet } from "@/components/providers/wallet-provider";
import { getCommonTokenPairs, getPoolsInfo, type PoolInfo } from "@/lib/railgun/uniswap-pools";

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
    const [showTokenAMenu, setShowTokenAMenu] = useState(false);
    const [showTokenBMenu, setShowTokenBMenu] = useState(false);
    const tokenAMenuRef = useRef<HTMLDivElement>(null);
    const tokenBMenuRef = useRef<HTMLDivElement>(null);
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

    // 加載池子列表
    useEffect(() => {
        const loadPools = async () => {
            if (currentStage !== "pool-selection" || !signer?.provider) {
                return;
            }

            setIsLoadingPools(true);
            try {
                const commonPairs = getCommonTokenPairs();
                const poolsInfo = await getPoolsInfo(commonPairs, signer.provider);
                setPools(poolsInfo);
            } catch (error) {
                console.error("Failed to load pools:", error);
            } finally {
                setIsLoadingPools(false);
            }
        };

        loadPools();
    }, [currentStage, signer]);

    // 點擊外部關閉選單
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tokenAMenuRef.current && !tokenAMenuRef.current.contains(event.target as Node)) {
                setShowTokenAMenu(false);
            }
            if (tokenBMenuRef.current && !tokenBMenuRef.current.contains(event.target as Node)) {
                setShowTokenBMenu(false);
            }
        };

        if (showTokenAMenu || showTokenBMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showTokenAMenu, showTokenBMenu]);

    const tokenAInfo = getTokenInfo(tokenA);
    const tokenBInfo = getTokenInfo(tokenB);
    const tokenABalance = getTokenBalance(tokenA);
    const tokenBBalance = getTokenBalance(tokenB);

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
                            <div className="w-full p-4 border-2 border-gray-200 bg-gray-50 rounded-lg flex items-center justify-center">
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

                    {/* 顯示選中的池子信息 - 更突出的樣式 */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg mb-6">
                        <div className="text-xs font-bold mb-3 text-gray-600 uppercase tracking-wide">選中的池子 (Selected Pool)</div>
                        <div className="flex items-center gap-3">
                            {selectedPool.token0LogoUrl && (
                                <img src={selectedPool.token0LogoUrl} alt={selectedPool.token0Symbol} className="w-8 h-8 rounded-full border-2 border-white shadow-md" />
                            )}
                            <span className="font-bold text-lg">{selectedPool.token0Symbol}</span>
                            <span className="text-gray-400 text-xl">/</span>
                            {selectedPool.token1LogoUrl && (
                                <img src={selectedPool.token1LogoUrl} alt={selectedPool.token1Symbol} className="w-8 h-8 rounded-full border-2 border-white shadow-md" />
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
                                            : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
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

                    {/* 顯示選中的池子信息 - 與操作選擇階段保持一致 */}
                    {selectedPool && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg mb-6">
                            <div className="text-xs font-bold mb-3 text-gray-600 uppercase tracking-wide">選中的池子 (Selected Pool)</div>
                            <div className="flex items-center gap-3">
                                {selectedPool.token0LogoUrl && (
                                    <img src={selectedPool.token0LogoUrl} alt={selectedPool.token0Symbol} className="w-8 h-8 rounded-full border-2 border-white shadow-md" />
                                )}
                                <span className="font-bold text-lg">{selectedPool.token0Symbol}</span>
                                <span className="text-gray-400 text-xl">/</span>
                                {selectedPool.token1LogoUrl && (
                                    <img src={selectedPool.token1LogoUrl} alt={selectedPool.token1Symbol} className="w-8 h-8 rounded-full border-2 border-white shadow-md" />
                                )}
                                <span className="font-bold text-lg">{selectedPool.token1Symbol}</span>
                            </div>
                        </div>
                    )}

                    {/* 代幣對選擇 - 使用 Grid 布局，突出顯示 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 代幣 A */}
                        <div className="space-y-2">
                            <label className="font-bold">代幣 A (Token A)</label>
                            <div className="relative" ref={tokenAMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowTokenAMenu(!showTokenAMenu)}
                                    className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
                                >
                                    {tokenAInfo.logoUrl && (
                                        <img 
                                            src={tokenAInfo.logoUrl} 
                                            alt="Token A"
                                            className="w-5 h-5 rounded-full"
                                        />
                                    )}
                                    <span className="flex-1 text-left">
                                        {tokenAInfo.symbol || "選擇代幣"}
                                    </span>
                                    <span className="text-gray-400">▼</span>
                                </button>
                                {showTokenAMenu && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-60 overflow-y-auto">
                                        {allTokens.map((token: any) => {
                                            const balance = token.hasBalance ? formatUnits(token.balance, token.decimals) : "0";
                                            const isSelected = token.address.toLowerCase() === tokenA.toLowerCase();
                                            return (
                                                <button
                                                    key={token.address}
                                                    type="button"
                                                    onClick={() => {
                                                        setTokenA(token.address);
                                                        setShowTokenAMenu(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                                                        isSelected ? "bg-gray-200 font-bold" : ""
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {token.logoUrl && (
                                                            <img src={token.logoUrl} alt={token.symbol} className="w-5 h-5 rounded-full" />
                                                        )}
                                                        <span>{token.symbol}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-500">
                                                            {parseFloat(balance).toFixed(6)}
                                                        </span>
                                                        {isSelected && <span className="text-xs">✓</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amountA}
                                    onChange={(e) => setAmountA(e.target.value)}
                                    placeholder="0.0"
                                    className="w-full p-4 border-2 border-black rounded-lg text-xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                                    {tokenAInfo.symbol || "TOKEN"}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 text-right">
                                隱私餘額: {parseFloat(tokenABalance).toFixed(6)}
                            </p>
                        </div>

                        {/* 代幣 B */}
                        <div className="space-y-2">
                            <label className="font-bold">代幣 B (Token B)</label>
                            <div className="relative" ref={tokenBMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowTokenBMenu(!showTokenBMenu)}
                                    className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
                                >
                                    {tokenBInfo.logoUrl && (
                                        <img 
                                            src={tokenBInfo.logoUrl} 
                                            alt="Token B"
                                            className="w-5 h-5 rounded-full"
                                        />
                                    )}
                                    <span className="flex-1 text-left">
                                        {tokenBInfo.symbol || "選擇代幣"}
                                    </span>
                                    <span className="text-gray-400">▼</span>
                                </button>
                                {showTokenBMenu && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-60 overflow-y-auto">
                                        {allTokens.map((token: any) => {
                                            const balance = token.hasBalance ? formatUnits(token.balance, token.decimals) : "0";
                                            const isSelected = token.address.toLowerCase() === tokenB.toLowerCase();
                                            return (
                                                <button
                                                    key={token.address}
                                                    type="button"
                                                    onClick={() => {
                                                        setTokenB(token.address);
                                                        setShowTokenBMenu(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                                                        isSelected ? "bg-gray-200 font-bold" : ""
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {token.logoUrl && (
                                                            <img src={token.logoUrl} alt={token.symbol} className="w-5 h-5 rounded-full" />
                                                        )}
                                                        <span>{token.symbol}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-500">
                                                            {parseFloat(balance).toFixed(6)}
                                                        </span>
                                                        {isSelected && <span className="text-xs">✓</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amountB}
                                    onChange={(e) => setAmountB(e.target.value)}
                                    placeholder="0.0"
                                    className="w-full p-4 border-2 border-black rounded-lg text-xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                                    {tokenBInfo.symbol || "TOKEN"}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 text-right">
                                隱私餘額: {parseFloat(tokenBBalance).toFixed(6)}
                            </p>
                        </div>
                    </div>

                    {/* 隱私餘額顯示 - 簡化，放在次要位置 */}
                    {railgunAddress && tokensWithBalance.length > 0 && (
                        <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg">
                            <div className="text-xs font-bold mb-2 text-gray-600">隱私餘額 (Private Balance)</div>
                            <div className="flex flex-wrap gap-3">
                                {tokensWithBalance.map((token: any) => {
                                    const formattedBalance = formatUnits(token.balance, token.decimals);
                                    return (
                                        <div key={token.address} className="flex items-center gap-1 text-sm">
                                            {token.logoUrl && (
                                                <img src={token.logoUrl} alt={token.symbol} className="w-4 h-4" />
                                            )}
                                            <span className="font-bold">{token.symbol}:</span>
                                            <span className="font-mono text-gray-600">{parseFloat(formattedBalance).toFixed(4)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 發送按鈕 */}
                    <Button
                        onClick={handleAddLiquidity}
                        disabled={isLoading || !tokenA || !tokenB || !amountA || !amountB}
                        className="w-full py-6 text-xl font-bold bg-black text-white hover:bg-gray-800 border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "處理中..." : "添加流動性 (Add Liquidity)"}
                    </Button>
                </div>
            )}

            {/* 移除流動性顯示 Coming Soon */}
            {currentStage === "liquidity" && liquidityFunction === "remove-liquidity" && (
                <div className="p-8 bg-gray-50 border-2 border-gray-300 rounded-lg text-center">
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

