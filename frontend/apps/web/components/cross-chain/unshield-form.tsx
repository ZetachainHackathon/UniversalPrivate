import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@repo/ui/components/button";
import { formatEther, ZeroAddress } from "ethers";
import { CONFIG } from "@/config/env";
import { getTokenSymbol, getTokenLogoUrl, getAvailableTargetTokens } from "@/lib/railgun/token-utils";
import { getEstimatedOutputAfterFee } from "@/lib/railgun/uniswap-quote";

interface UnshieldFormProps {
    recipient: string;
    setRecipient: (recipient: string) => void;
    amount: string;
    setAmount: (amount: string) => void;
    tokenAddress: string;
    setTokenAddress: (address: string) => void;
    balances: any;
    handleUnshield: () => void;
    isLoading: boolean;
    targetChain: string;
    setTargetChain: (chain: string) => void;
    targetTokenAddress: string;
    setTargetTokenAddress: (address: string) => void;
}

export function UnshieldForm({
    recipient,
    setRecipient,
    amount,
    setAmount,
    tokenAddress,
    setTokenAddress,
    balances,
    handleUnshield,
    isLoading,
    targetChain,
    setTargetChain,
    targetTokenAddress,
    setTargetTokenAddress,
}: UnshieldFormProps) {
    // 獲取有餘額的 Token 列表
    const tokensWithBalance = useMemo(() => {
        if (!balances?.erc20Amounts) return [];
        
        return balances.erc20Amounts
            .filter((token: any) => token.amount > 0n)
            .map((token: any) => ({
                address: token.tokenAddress,
                symbol: getTokenSymbol(token.tokenAddress),
                balance: token.amount,
            }))
            .sort((a: { address: string; symbol: string; balance: bigint }, b: { address: string; symbol: string; balance: bigint }) => {
                // 按餘額排序（從大到小）
                if (b.balance > a.balance) return 1;
                if (b.balance < a.balance) return -1;
                return 0;
            });
    }, [balances]);

    // 獲取可用的目標鏈列表
    const availableTargetChains = useMemo(() => {
        return Object.entries(CONFIG.CHAINS)
            .filter(([key, config]) => {
                // 排除 ZETACHAIN（它不是目標鏈）
                if (key === "ZETACHAIN") return false;
                // 只顯示有 ZRC20_GAS 配置的鏈
                return "ZRC20_GAS" in config && config.ZRC20_GAS;
            })
            .map(([key, config]) => ({
                key,
                value: key.toLowerCase().replace(/_/g, "-"),
                name: key
                    .split("_")
                    .map(word => {
                        const lower = word.toLowerCase();
                        if (lower === "bsc") return "BSC";
                        if (lower === "testnet" || lower === "test") return "Testnet";
                        if (lower === "fuji") return "Fuji";
                        if (lower === "amoy") return "Amoy";
                        return word.charAt(0) + word.slice(1).toLowerCase();
                    })
                    .join(" "),
                logo: "CHAIN_LOGO" in config ? config.CHAIN_LOGO : null,
            }));
    }, []);

    // 獲取目標鏈的可用代幣列表
    const availableTargetTokens = useMemo(() => {
        return getAvailableTargetTokens(targetChain);
    }, [targetChain]);

    const [showChainMenu, setShowChainMenu] = useState(false);
    const [showTokenMenu, setShowTokenMenu] = useState(false);
    const [showTargetTokenMenu, setShowTargetTokenMenu] = useState(false);
    const [estimatedOutput, setEstimatedOutput] = useState<string | null>(null);
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const chainMenuRef = useRef<HTMLDivElement>(null);
    const tokenMenuRef = useRef<HTMLDivElement>(null);
    const targetTokenMenuRef = useRef<HTMLDivElement>(null);

    // 獲取當前選擇的 Token 信息
    const selectedToken = useMemo(() => {
        if (!tokenAddress || tokenAddress === ZeroAddress || tokenAddress === "") {
            return { symbol: "WZETA", address: ZeroAddress, logoUrl: CONFIG.TOKENS.WZETA.logoUrl };
        }
        
        return {
            symbol: getTokenSymbol(tokenAddress),
            address: tokenAddress,
            logoUrl: getTokenLogoUrl(tokenAddress),
        };
    }, [tokenAddress]);

    // 獲取當前選擇的鏈信息
    const selectedChain = useMemo(() => {
        const chainKey = targetChain.toUpperCase().replace(/-/g, "_") as keyof typeof CONFIG.CHAINS;
        if (chainKey in CONFIG.CHAINS) {
            const chainConfig = CONFIG.CHAINS[chainKey];
            const chainDisplayName = chainKey
                .split("_")
                .map(word => {
                    const lower = word.toLowerCase();
                    if (lower === "bsc") return "BSC";
                    if (lower === "testnet" || lower === "test") return "Testnet";
                    if (lower === "fuji") return "Fuji";
                    if (lower === "amoy") return "Amoy";
                    return word.charAt(0) + word.slice(1).toLowerCase();
                })
                .join(" ");
            return {
                name: chainDisplayName,
                logo: "CHAIN_LOGO" in chainConfig ? chainConfig.CHAIN_LOGO : null,
            };
        }
        return { name: "Unknown", logo: null };
    }, [targetChain]);

    // 獲取當前選擇的目標代幣信息
    const selectedTargetToken = useMemo(() => {
        // 如果沒有可用代幣，返回預設值
        if (availableTargetTokens.length === 0) {
            return { symbol: "Unknown", address: ZeroAddress, logoUrl: undefined };
        }

        // 如果沒有選擇目標代幣，返回第一個可用代幣（通常是 Gas Token）
        if (!targetTokenAddress || targetTokenAddress === ZeroAddress || targetTokenAddress === "") {
            const firstToken = availableTargetTokens[0];
            if (firstToken && firstToken.address) {
                return {
                    symbol: firstToken.symbol,
                    address: firstToken.address,
                    logoUrl: firstToken.logoUrl,
                };
            }
            return { symbol: "Unknown", address: ZeroAddress, logoUrl: undefined };
        }
        
        // 查找匹配的代幣
        const token = availableTargetTokens.find(t => 
            t.address && targetTokenAddress && 
            t.address.toLowerCase() === targetTokenAddress.toLowerCase()
        );
        
        if (token && token.address) {
            return {
                symbol: token.symbol,
                address: token.address,
                logoUrl: token.logoUrl,
            };
        }
        
        // 如果找不到匹配的代幣，嘗試使用 getTokenSymbol 和 getTokenLogoUrl
        try {
            return {
                symbol: getTokenSymbol(targetTokenAddress),
                address: targetTokenAddress,
                logoUrl: getTokenLogoUrl(targetTokenAddress),
            };
        } catch (error) {
            // 如果出錯，返回第一個可用代幣
            const firstToken = availableTargetTokens[0];
            if (firstToken && firstToken.address) {
                return {
                    symbol: firstToken.symbol,
                    address: firstToken.address,
                    logoUrl: firstToken.logoUrl,
                };
            }
            return { symbol: "Unknown", address: ZeroAddress, logoUrl: undefined };
        }
    }, [targetTokenAddress, availableTargetTokens]);

    // 點擊外部關閉選單
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (chainMenuRef.current && !chainMenuRef.current.contains(event.target as Node)) {
                setShowChainMenu(false);
            }
            if (tokenMenuRef.current && !tokenMenuRef.current.contains(event.target as Node)) {
                setShowTokenMenu(false);
            }
            if (targetTokenMenuRef.current && !targetTokenMenuRef.current.contains(event.target as Node)) {
                setShowTargetTokenMenu(false);
            }
        };

        if (showChainMenu || showTokenMenu || showTargetTokenMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showChainMenu, showTokenMenu, showTargetTokenMenu]);

    // 確保 targetChain 是有效的，如果不是則設置為第一個可用的鏈
    useEffect(() => {
        if (availableTargetChains.length > 0) {
            const isValidChain = availableTargetChains.some(chain => chain.value === targetChain);
            if (!isValidChain && availableTargetChains[0]) {
                setTargetChain(availableTargetChains[0].value);
            }
        }
    }, [availableTargetChains, targetChain, setTargetChain]);

    // 當目標鏈改變時，自動設置第一個可用目標代幣為預設值
    useEffect(() => {
        if (availableTargetTokens.length > 0 && availableTargetTokens[0]) {
            const firstToken = availableTargetTokens[0];
            if (firstToken && firstToken.address) {
                const isValidToken = availableTargetTokens.some(
                    token => token.address.toLowerCase() === targetTokenAddress.toLowerCase()
                );
                if (!isValidToken || !targetTokenAddress || targetTokenAddress === ZeroAddress || targetTokenAddress === "") {
                    setTargetTokenAddress(firstToken.address);
                }
            }
        } else if (targetTokenAddress && targetTokenAddress !== ZeroAddress && targetTokenAddress !== "") {
            // 如果沒有可用代幣，但當前有選擇的代幣，清空它
            setTargetTokenAddress("");
        }
    }, [targetChain, availableTargetTokens]); // eslint-disable-line react-hooks/exhaustive-deps

    // 當有餘額時，自動設置第一個 Token 為預設值（僅在初始化時）
    useEffect(() => {
        if (tokensWithBalance.length > 0 && (tokenAddress === ZeroAddress || tokenAddress === "")) {
            setTokenAddress(tokensWithBalance[0].address);
        }
    }, [tokensWithBalance.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // 計算可用餘額（用於顯示）
    const availableBalance = useMemo(() => {
        if (!tokensWithBalance.length) return "0";
        const token = tokensWithBalance.find((t: { address: string; symbol: string; balance: bigint }) => t.address === selectedToken.address);
        return token ? formatEther(token.balance) : "0";
    }, [tokensWithBalance, selectedToken.address]);

    // 查詢預估交換數量（當金額、來源代幣或目標代幣改變時）
    useEffect(() => {
        const fetchQuote = async () => {
            // 如果金額為空或為 0，清空預估
            if (!amount || parseFloat(amount) <= 0) {
                setEstimatedOutput(null);
                return;
            }

            // 如果沒有選擇來源代幣或目標代幣，清空預估
            if (!selectedToken.address || selectedToken.address === ZeroAddress || 
                !selectedTargetToken.address || selectedTargetToken.address === ZeroAddress) {
                setEstimatedOutput(null);
                return;
            }

            setIsLoadingQuote(true);
            try {
                const quote = await getEstimatedOutputAfterFee(
                    amount,
                    selectedToken.address,
                    selectedTargetToken.address
                );
                setEstimatedOutput(quote);
            } catch (error) {
                console.error("查詢預估交換數量失敗:", error);
                setEstimatedOutput(null);
            } finally {
                setIsLoadingQuote(false);
            }
        };

        // 延遲查詢，避免用戶輸入時頻繁請求
        const timeoutId = setTimeout(fetchQuote, 500);
        return () => clearTimeout(timeoutId);
    }, [amount, selectedToken.address, selectedTargetToken.address]);

    return (
        <div className="space-y-4">
            {/* 表單欄位（僅在未顯示預覽時顯示） */}
            {!showPreview && (
                <>
            {/* SWAP 指示器（僅在代幣不同時顯示，放在選擇代幣上方） */}
            {selectedToken.address.toLowerCase() !== selectedTargetToken.address.toLowerCase() && (
                <div className="p-3 border-2 border-black rounded-lg bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-center gap-2">
                        {selectedToken.logoUrl && (
                            <img 
                                src={selectedToken.logoUrl} 
                                alt={selectedToken.symbol}
                                className="w-5 h-5 rounded-full"
                            />
                        )}
                        <span className="text-sm font-bold text-gray-700">{selectedToken.symbol}</span>
                        <svg 
                            className="w-5 h-5 text-black" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-sm font-bold text-gray-600">SWAP</span>
                        <svg 
                            className="w-5 h-5 text-black" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        {selectedTargetToken.logoUrl && (
                            <img 
                                src={selectedTargetToken.logoUrl} 
                                alt={selectedTargetToken.symbol}
                                className="w-5 h-5 rounded-full"
                            />
                        )}
                        <span className="text-sm font-bold text-gray-700">{selectedTargetToken.symbol}</span>
                    </div>
                </div>
            )}

            {/* 1. 選擇代幣 (源代幣) */}
            <div className="space-y-2">
                <label className="font-bold">選擇代幣 (Select Token)</label>
                        {tokensWithBalance.length > 0 ? (
                            <div className="relative" ref={tokenMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowTokenMenu(!showTokenMenu)}
                                    className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
                                >
                                    {selectedToken.logoUrl && (
                                        <img 
                                            src={selectedToken.logoUrl} 
                                            alt={selectedToken.symbol}
                                            className="w-5 h-5 rounded-full"
                                        />
                                    )}
                                    <span className="flex-1 text-left">
                                        {selectedToken.symbol} (
                                        {(() => {
                                            const token = tokensWithBalance.find((t: { address: string; symbol: string; balance: bigint }) => t.address === selectedToken.address);
                                            return token ? formatEther(token.balance).slice(0, 8) : "0";
                                        })()}
                                        )
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">
                                        {selectedToken.address === ZeroAddress 
                                            ? "Native Token"
                                            : `${selectedToken.address.slice(0, 6)}...${selectedToken.address.slice(-4)}`}
                                    </span>
                                    <span className="text-gray-400">▼</span>
                                </button>
                                
                                {showTokenMenu && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-60 overflow-y-auto">
                                        {tokensWithBalance.map((token: { address: string; symbol: string; balance: bigint }) => {
                                            const tokenLogoUrl = getTokenLogoUrl(token.address);
                                            const isSelected = token.address === selectedToken.address;
                                            return (
                                                <button
                                                    key={token.address}
                                                    type="button"
                                                    onClick={() => {
                                                        setTokenAddress(token.address);
                                                        setShowTokenMenu(false);
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                                                        isSelected ? "bg-gray-200 font-bold" : ""
                                                    }`}
                                                >
                                                    {tokenLogoUrl && (
                                                        <img 
                                                            src={tokenLogoUrl} 
                                                            alt={token.symbol}
                                                            className="w-6 h-6 rounded-full"
                                                        />
                                                    )}
                                                    <span className="flex-1">
                                                        {token.symbol} ({formatEther(token.balance).slice(0, 8)})
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-mono">
                                                        {token.address === ZeroAddress 
                                                            ? "Native Token"
                                                            : `${token.address.slice(0, 6)}...${token.address.slice(-4)}`}
                                                    </span>
                                                    {isSelected && <span className="text-xs">✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500">
                                沒有可用的 Token 餘額
                            </div>
                        )}
            </div>

            {/* 2. 金額 */}
            <div className="space-y-2">
                <label className="font-bold">金額 (Amount)</label>
                <div className="relative">
                    <input
                        type="number"
                        step="any"
                        className="w-full p-4 border-2 border-black rounded-lg text-xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                        {selectedToken.symbol}
                    </span>
                </div>
                <p className="text-sm text-gray-500 text-right">
                    可用餘額: {parseFloat(availableBalance).toFixed(4)} {selectedToken.symbol}
                </p>
            </div>

            {/* 箭頭分隔線（在金額和目標鏈之間） */}
            <div className="flex justify-center py-2">
                <svg 
                    className="w-6 h-6 text-black" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* 3. 目標鏈 */}
            <div className="space-y-2">
                <label className="font-bold">目標鏈 (Target Chain)</label>
                        <div className="relative" ref={chainMenuRef}>
                            <button
                                type="button"
                                onClick={() => setShowChainMenu(!showChainMenu)}
                                className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
                            >
                                {selectedChain.logo && (
                                    <img 
                                        src={selectedChain.logo} 
                                        alt={selectedChain.name}
                                        className="w-5 h-5 rounded-full"
                                    />
                                )}
                                <span className="flex-1 text-left">{selectedChain.name}</span>
                                <span className="text-gray-400">▼</span>
                            </button>
                            
                            {showChainMenu && availableTargetChains.length > 0 && (
                                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-60 overflow-y-auto">
                                    {availableTargetChains.map((chain) => (
                                        <button
                                            key={chain.key}
                                            type="button"
                                            onClick={() => {
                                                setTargetChain(chain.value);
                                                setShowChainMenu(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                                                targetChain === chain.value ? "bg-gray-200 font-bold" : ""
                                            }`}
                                        >
                                            {chain.logo && (
                                                <img 
                                                    src={chain.logo} 
                                                    alt={chain.name}
                                                    className="w-6 h-6 rounded-full"
                                                />
                                            )}
                                            <span className="flex-1">{chain.name}</span>
                                            {targetChain === chain.value && <span className="text-xs">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

            {/* 4. 目標代幣 */}
            <div className="space-y-2">
                <label className="font-bold">目標代幣 (Target Token)</label>
                        {availableTargetTokens.length > 0 ? (
                            <div className="relative" ref={targetTokenMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowTargetTokenMenu(!showTargetTokenMenu)}
                                    className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
                                >
                                    {selectedTargetToken.logoUrl && (
                                        <img
                                            src={selectedTargetToken.logoUrl}
                                            alt={selectedTargetToken.symbol}
                                            className="w-5 h-5 rounded-full"
                                        />
                                    )}
                                    <span className="flex-1 text-left">{selectedTargetToken.symbol}</span>
                                    <span className="text-xs text-gray-400 font-mono">
                                        {selectedTargetToken.address === ZeroAddress
                                            ? "Native Token"
                                            : `${selectedTargetToken.address.slice(0, 6)}...${selectedTargetToken.address.slice(-4)}`}
                                    </span>
                                    <span className="text-gray-400">▼</span>
                                </button>

                                {showTargetTokenMenu && availableTargetTokens.length > 0 && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-60 overflow-y-auto">
                                    {availableTargetTokens.map((token) => {
                                        const isSelected = token.address.toLowerCase() === selectedTargetToken.address.toLowerCase();
                                        return (
                                            <button
                                                key={token.address}
                                                type="button"
                                                onClick={() => {
                                                    setTargetTokenAddress(token.address);
                                                    setShowTargetTokenMenu(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                                                    isSelected ? "bg-gray-200 font-bold" : ""
                                                }`}
                                            >
                                                {token.logoUrl && (
                                                    <img
                                                        src={token.logoUrl}
                                                        alt={token.symbol}
                                                        className="w-6 h-6 rounded-full"
                                                    />
                                                )}
                                                <span className="flex-1">{token.symbol}</span>
                                                <span className="text-xs text-gray-400 font-mono">
                                                    {token.address === ZeroAddress
                                                        ? "Native Token"
                                                        : `${token.address.slice(0, 6)}...${token.address.slice(-4)}`}
                                                </span>
                                                {isSelected && <span className="text-xs">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500">
                                沒有可用的目標代幣
                            </div>
                        )}

                    </div>

            {/* 5. 接收方地址 */}
            <div className="space-y-2">
                <label className="font-bold">接收方 EVM 地址 (0x...)</label>
                <input
                    type="text"
                    placeholder="0x..."
                    className="w-full p-4 border-2 border-black rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                />
            </div>
                </>
            )}

            {/* 交易預覽（發送交易前的確認步驟） */}
            {showPreview && amount && parseFloat(amount) > 0 && recipient && recipient.trim() !== "" && 
             selectedToken.address && selectedTargetToken.address && (
                <div className="p-5 border-4 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-black uppercase tracking-wide">交易預覽</h3>
                        <p className="text-xs text-gray-500 mt-1">請確認以下交易詳情</p>
                    </div>

                    {/* 視覺化交換流程 */}
                    <div className="flex items-center gap-3 mb-4">
                        {/* 輸入代幣 */}
                        <div className="flex-1 flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg bg-gray-50">
                            {selectedToken.logoUrl && (
                                <img 
                                    src={selectedToken.logoUrl} 
                                    alt={selectedToken.symbol}
                                    className="w-8 h-8 rounded-full"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 font-medium truncate">
                                    {selectedToken.symbol}
                                </div>
                                <div className="text-base font-bold text-gray-900">
                                    {parseFloat(amount).toFixed(6)}
                                </div>
                            </div>
                        </div>

                        {/* 箭頭和匯率 */}
                        <div className="flex flex-col items-center gap-1">
                            {isLoadingQuote ? (
                                <div className="w-10 h-10 border-2 border-gray-300 rounded-full flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : estimatedOutput ? (
                                <>
                                    <svg 
                                        className="w-8 h-8 text-black" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="3" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    {selectedToken.address.toLowerCase() !== selectedTargetToken.address.toLowerCase() && (
                                        <div className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-300 whitespace-nowrap">
                                            {parseFloat(amount) > 0 && estimatedOutput ? 
                                                `1 ${selectedToken.symbol} ≈ ${(parseFloat(estimatedOutput) / parseFloat(amount)).toFixed(4)} ${selectedTargetToken.symbol}` 
                                                : "-"
                                            }
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-xs text-gray-400">無法預估</div>
                            )}
                        </div>

                        {/* 輸出代幣 */}
                        <div className="flex-1 flex items-center gap-2 p-3 border-2 border-black rounded-lg bg-white">
                            {selectedTargetToken.logoUrl && (
                                <img 
                                    src={selectedTargetToken.logoUrl} 
                                    alt={selectedTargetToken.symbol}
                                    className="w-8 h-8 rounded-full"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 font-medium truncate">
                                    {selectedTargetToken.symbol}
                                </div>
                                <div className="text-base font-bold text-black">
                                    {isLoadingQuote ? (
                                        <span className="text-gray-400">計算中...</span>
                                    ) : estimatedOutput ? (
                                        parseFloat(estimatedOutput).toFixed(6)
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 交易詳情 */}
                    <div className="space-y-2 pt-3 border-t-2 border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-medium">目標鏈</span>
                            <div className="flex items-center gap-2">
                                {selectedChain.logo && (
                                    <img 
                                        src={selectedChain.logo} 
                                        alt={selectedChain.name}
                                        className="w-4 h-4 rounded-full"
                                    />
                                )}
                                <span className="font-bold text-black">{selectedChain.name}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-medium">接收地址</span>
                            <span className="font-mono text-xs text-black font-bold">
                                {recipient.slice(0, 6)}...{recipient.slice(-4)}
                            </span>
                        </div>
                        {/* 手續費資訊 */}
                        {amount && parseFloat(amount) > 0 && (
                            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                                <span className="text-gray-600 font-medium">手續費</span>
                                <span className="font-bold text-black">
                                    {((parseFloat(amount) * 25) / 10000).toFixed(6)} {selectedToken.symbol} <span className="text-xs text-gray-500 font-normal">(0.25%)</span>
                                </span>
                            </div>
                        )}
                        {estimatedOutput && selectedToken.address.toLowerCase() !== selectedTargetToken.address.toLowerCase() && (
                            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                                <span className="text-gray-600 font-medium">預估可獲得</span>
                                <span className="font-bold text-black">
                                    {parseFloat(estimatedOutput).toFixed(6)} {selectedTargetToken.symbol}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 預覽卡片中的操作按鈕 */}
                    <div className="flex gap-3 mt-4 pt-4 border-t-2 border-gray-200">
                        <Button
                            onClick={() => setShowPreview(false)}
                            disabled={isLoading}
                            className="flex-1 py-4 text-lg font-bold bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            返回編輯
                        </Button>
                        <Button
                            onClick={() => {
                                handleUnshield();
                                setShowPreview(false);
                            }}
                            disabled={isLoading}
                            className="flex-1 py-4 text-lg font-bold bg-black text-white border-2 border-black hover:bg-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            {isLoading ? "處理中..." : "發送交易"}
                        </Button>
                    </div>
                </div>
            )}

            {/* 查看預覽按鈕（第一步） */}
            {!showPreview && (
                <Button
                    onClick={() => {
                        // 驗證表單
                        if (!amount || parseFloat(amount) <= 0) {
                            return;
                        }
                        if (!recipient || recipient.trim() === "") {
                            return;
                        }
                        if (!selectedToken.address || !selectedTargetToken.address) {
                            return;
                        }
                        setShowPreview(true);
                    }}
                    disabled={isLoading || !amount || parseFloat(amount) <= 0 || !recipient || recipient.trim() === "" || !selectedToken.address || !selectedTargetToken.address}
                    className="w-full py-6 text-xl font-bold bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    查看預覽
                </Button>
            )}
        </div>
    );
}

