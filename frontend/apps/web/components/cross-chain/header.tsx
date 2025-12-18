import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@repo/ui/components/button";
import { formatEther } from "ethers";
import { Wallet, Copy, Download, Trash2, RefreshCw } from "lucide-react";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";
import { MnemonicExportModal } from "./mnemonic-export-modal";
import { CONFIG } from "@/config/env";
import { getTokenSymbol, getTokenLogoUrl } from "@/lib/railgun/token-utils";
import { toast } from "@repo/ui/components/sonner";

export function CrossChainHeader() {
    const { isConnected, address, connectWallet, currentChainId, currentChainName, switchNetwork, balance: walletBalance } = useWallet();
    const { isReady: isRailgunReady, walletInfo, balances } = useRailgun();
    const [showNetworkMenu, setShowNetworkMenu] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showAccountCard, setShowAccountCard] = useState(false);
    const [showEvmWalletCard, setShowEvmWalletCard] = useState(false);
    const [showAllTokens, setShowAllTokens] = useState(false);
    const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const settingsMenuRef = useRef<HTMLDivElement>(null);
    const accountCardRef = useRef<HTMLDivElement>(null);
    const evmWalletCardRef = useRef<HTMLDivElement>(null);

    // 獲取隱私餘額中的代幣列表
    const privateBalances = useMemo(() => {
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

    // 獲取當前鏈的原生代幣符號（簡化顯示）
    const getCurrentChainTokenSymbol = () => {
        if (!currentChainName) return { symbol: "ETH", chainName: null };
        const chainKey = currentChainName.toUpperCase();
        // 根據鏈名稱返回對應的代幣符號和鏈名稱
        if (chainKey.includes("SEPOLIA")) return { symbol: "ETH", chainName: "Sepolia" };
        if (chainKey.includes("BASE")) return { symbol: "ETH", chainName: "Base" };
        if (chainKey.includes("ZETACHAIN")) return { symbol: "WZETA", chainName: null };
        return { symbol: "ETH", chainName: null };
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`${label} 已複製！`);
    };

    // 獲取當前鏈的顯示信息
    const getCurrentChainDisplay = () => {
        if (!currentChainName || !(currentChainName in CONFIG.CHAINS)) {
            return { name: "Unknown", logo: null };
        }
        const chainConfig = CONFIG.CHAINS[currentChainName as keyof typeof CONFIG.CHAINS];
        const chainDisplayName = currentChainName
            .split("_")
            .map(word => {
                const lower = word.toLowerCase();
                if (lower === "bsc") return "BSC";
                if (lower === "testnet" || lower === "test") return "Testnet";
                if (lower === "fuji") return "Fuji";
                if (lower === "amoy") return "Amoy";
                if (lower === "zetachain") return "ZetaChain";
                return word.charAt(0) + word.slice(1).toLowerCase();
            })
            .join(" ");
        return {
            name: chainDisplayName,
            logo: "CHAIN_LOGO" in chainConfig ? chainConfig.CHAIN_LOGO : null,
        };
    };

    // 處理網路切換
    const handleNetworkSwitch = async (chainKey: keyof typeof CONFIG.CHAINS) => {
        const chainConfig = CONFIG.CHAINS[chainKey];
        if (!chainConfig) return;
        
        try {
            await switchNetwork(chainConfig.ID_HEX);
            setShowNetworkMenu(false);
        } catch (error) {
            console.error("切換網路失敗:", error);
        }
    };

    // 計算隱私總額（用於扁平顯示）
    const privateBalanceTotal = useMemo(() => {
        if (!privateBalances.length || !privateBalances[0]) return null;
        const balance = Number(formatEther(privateBalances[0].balance));
        return {
            amount: balance.toFixed(2),
            symbol: privateBalances[0].symbol,
            hasMore: privateBalances.length > 1
        };
    }, [privateBalances]);

    // 點擊外部關閉選單
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            
            // 檢查是否有打開的 Dialog（Radix UI Dialog 會渲染到 Portal 中）
            // 檢查點擊目標是否在 Dialog 內部
            const dialogElement = document.querySelector('[role="dialog"][data-state="open"]');
            const isInDialog = dialogElement && (
                dialogElement.contains(target) || 
                dialogElement === target ||
                // 檢查是否點擊在 Dialog 的 Overlay 上（Overlay 是 Dialog 的兄弟元素）
                target.closest('[data-radix-portal]')?.querySelector('[role="dialog"]') === dialogElement
            );
            
            // 如果點擊在 Dialog 內部或 Overlay 上，不要關閉選單
            if (isInDialog) {
                return;
            }
            
            if (menuRef.current && !menuRef.current.contains(target)) {
                setShowNetworkMenu(false);
            }
            if (settingsMenuRef.current && !settingsMenuRef.current.contains(target)) {
                setShowSettingsMenu(false);
            }
            if (accountCardRef.current && !accountCardRef.current.contains(target)) {
                setShowAccountCard(false);
                setShowAllTokens(false);
            }
            if (evmWalletCardRef.current && !evmWalletCardRef.current.contains(target)) {
                setShowEvmWalletCard(false);
            }
        };

        if (showNetworkMenu || showSettingsMenu || showAccountCard || showEvmWalletCard) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showNetworkMenu, showSettingsMenu, showAccountCard, showEvmWalletCard]);

    // Hard Reset Logic (Internalized for now, or can be kept in provider if needed frequently)
    const handleHardReset = async () => {
        if (!confirm("⚠️ 警告：這將清除本地資料庫並重新整理。確定要繼續嗎？")) return;
        try {
            const { clearRailgunStorage } = await import("@/lib/railgun/balance");
            await clearRailgunStorage();
            alert("✅ 快取已清除！");
            window.location.reload();
        } catch (e: any) {
            alert("❌ 清除失敗: " + e.message);
        }
    };

    // 重新加載餘額
    const handleRefreshBalance = async () => {
        if (!walletInfo?.id) {
            toast.error("無法重新加載餘額：錢包未登入");
            return;
        }

        setIsRefreshingBalance(true);
        const toastId = toast.loading("正在重新加載餘額...");
        
        try {
            const { triggerBalanceRefresh } = await import("@/lib/railgun/balance");
            await triggerBalanceRefresh(walletInfo.id);
            toast.success("餘額已重新加載", { id: toastId });
            // 不關閉選單，讓用戶看到更新後的餘額
        } catch (e: any) {
            console.error("重新加載餘額失敗:", e);
            toast.error("重新加載餘額失敗: " + (e.message || "未知錯誤"), { id: toastId });
        } finally {
            setIsRefreshingBalance(false);
        }
    };

    return (
        <header className="w-full h-16 flex justify-between items-center px-6 bg-white border-b border-gray-200 relative z-30">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button className="h-10 w-10 p-0 border-2 border-black bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-lg flex items-center justify-center text-xl font-bold">
                        ←
                    </Button>
                </Link>
                {walletInfo?.railgunAddress ? (
                    <div className="relative" ref={accountCardRef}>
                        {/* 膠囊形狀的組合按鈕 */}
                        <button
                            onClick={() => setShowAccountCard(!showAccountCard)}
                            className="h-10 flex items-center gap-3 px-4 border-2 border-black rounded-full bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            {/* 左半邊：圖示 + 地址 */}
                            <div className="flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-gray-900" />
                                <span className="font-bold text-sm text-gray-900">
                                    0zk: {walletInfo.railgunAddress.slice(0, 6)}...{walletInfo.railgunAddress.slice(-4)}
                                </span>
                            </div>
                            
                            {/* 右半邊：主幣種餘額 */}
                            {privateBalanceTotal ? (
                                <span className="font-bold text-sm text-gray-700">
                                    {privateBalanceTotal.amount} {privateBalanceTotal.symbol}
                                </span>
                            ) : (
                                <span className="font-bold text-sm text-gray-400">0.00</span>
                            )}
                        </button>

                        {/* 彈出的清單選單 */}
                        {showAccountCard && (
                            <div 
                                className="absolute left-0 top-full mt-1 min-w-full border-2 border-black rounded-lg bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* 第一行：隱私餘額清單 */}
                                <div className="px-4 py-3 border-b-2 border-gray-200">
                                    <div className="text-xs font-bold text-gray-500 mb-2">隱私餘額 (Private)</div>
                                    {privateBalances.length > 0 ? (
                                        <div className="space-y-1">
                                            {privateBalances.map((token: { address: string; symbol: string; balance: bigint }) => {
                                                const balance = Number(formatEther(token.balance));
                                                const tokenLogoUrl = getTokenLogoUrl(token.address);
                                                return (
                                                    <div 
                                                        key={token.address}
                                                        className="flex items-center justify-between py-1"
                                                    >
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            {tokenLogoUrl && (
                                                                <img 
                                                                    src={tokenLogoUrl} 
                                                                    alt={token.symbol}
                                                                    className="w-5 h-5 rounded-full flex-shrink-0"
                                                                />
                                                            )}
                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                <span className="text-sm font-bold text-gray-700">{token.symbol}</span>
                                                                <span className="text-xs text-gray-400 font-mono">
                                                                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-900 ml-2">
                                                            {balance.toFixed(4)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-sm font-bold text-gray-400">0.0000</div>
                                    )}
                                </div>
                                
                                {/* 分隔線 */}
                                <div className="border-t-2 border-gray-300"></div>
                                
                                {/* 第三行：重新加載餘額 */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRefreshBalance();
                                    }}
                                    disabled={isRefreshingBalance}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors border-b-2 border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshingBalance ? "animate-spin" : ""}`} />
                                    <span>{isRefreshingBalance ? "重新加載中..." : "重新加載餘額"}</span>
                                </button>
                                
                                {/* 第四行：Export Seed */}
                                <MnemonicExportModal
                                    trigger={
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // 點擊 Export Seed 時不關閉選單，讓 Modal 處理
                                            }}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors border-b-2 border-gray-200"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>Export Seed/助記詞</span>
                                        </button>
                                    }
                                />
                                
                                {/* 第五行：Reset Cache */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowAccountCard(false);
                                        handleHardReset();
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Reset Cache/重置快取</span>
                                </button>
                                
                                {/* Copy 地址選項 */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(walletInfo.railgunAddress, "0zk Address");
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors border-t-2 border-gray-200"
                                >
                                    <Copy className="w-4 h-4" />
                                    <span>Copy Address</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    // 尚未登入：不顯示登入框（因已移至首頁），只顯示提示或空
                    <div className="text-sm font-bold text-gray-400">
                        {isRailgunReady ? "Not Logged In" : "Initializing..."}
                    </div>
                )}
            </div>

            {/* 右上角：EVM 錢包區塊 + 網路切換 */}
            <div className="flex items-center gap-3">
                {/* EVM 錢包區塊 */}
                {isConnected && address ? (
                    <div className="relative" ref={evmWalletCardRef}>
                        <button
                            onClick={() => setShowEvmWalletCard(!showEvmWalletCard)}
                            className="h-10 flex items-center gap-3 px-4 border-2 border-black rounded-full bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            {/* 左半邊：圖示 + 地址 */}
                            <div className="flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-gray-900" />
                                <span className="font-bold text-sm text-gray-900">
                                    {address.slice(0, 6)}...{address.slice(-4)}
                                </span>
                            </div>
                            
                            {/* 右半邊：鏈餘額 */}
                            {(() => {
                                const tokenInfo = getCurrentChainTokenSymbol();
                                const chainDisplay = getCurrentChainDisplay();
                                return (
                                    <div className="flex items-center gap-2">
                                        {tokenInfo.chainName && chainDisplay.logo && (
                                            <img 
                                                src={chainDisplay.logo} 
                                                alt={tokenInfo.chainName}
                                                className="w-4 h-4 rounded-full"
                                            />
                                        )}
                                        <span className="font-bold text-sm text-gray-700">
                                            {parseFloat(walletBalance || "0").toFixed(4)} {tokenInfo.symbol}
                                        </span>
                                    </div>
                                );
                            })()}
                        </button>

                        {/* 彈出的清單選單 */}
                        {showEvmWalletCard && (
                            <div 
                                className="absolute right-0 top-full mt-1 min-w-full border-2 border-black rounded-lg bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* 第一行：當前鏈餘額 */}
                                {(() => {
                                    const tokenInfo = getCurrentChainTokenSymbol();
                                    const chainDisplay = getCurrentChainDisplay();
                                    return (
                                        <div className="px-4 py-3 border-b-2 border-gray-200">
                                            <div className="text-xs font-bold text-gray-500 mb-2">當前鏈餘額</div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {tokenInfo.chainName && chainDisplay.logo && (
                                                        <img 
                                                            src={chainDisplay.logo} 
                                                            alt={tokenInfo.chainName}
                                                            className="w-5 h-5 rounded-full flex-shrink-0"
                                                        />
                                                    )}
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="text-sm font-bold text-gray-700">{tokenInfo.symbol}</span>
                                                        <span className="text-xs text-gray-400 font-mono">
                                                            Native Token
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-bold text-gray-900 ml-2">
                                                    {parseFloat(walletBalance || "0").toFixed(4)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                {/* 分隔線 */}
                                <div className="border-t-2 border-gray-300"></div>
                                
                                {/* Copy 地址選項 */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(address, "EVM Address");
                                        setShowEvmWalletCard(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                    <span>Copy Address</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Button
                        onClick={() => {
                            connectWallet().catch((e) => {
                                console.error('connectWallet error:', e);
                            });
                        }}
                        className="h-10 px-4 border-2 border-black rounded-full bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        連接錢包
                    </Button>
                )}
                
                {/* 網路切換按鈕（獨立區塊） */}
                <div className="relative" ref={menuRef}>
                    <Button
                        onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                        className="h-10 px-4 border-2 border-black rounded-lg bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
                    >
                        {(() => {
                            const chainDisplay = getCurrentChainDisplay();
                            return (
                                <>
                                    {chainDisplay.logo && (
                                        <img 
                                            src={chainDisplay.logo} 
                                            alt={chainDisplay.name}
                                            className="w-5 h-5 rounded-full"
                                        />
                                    )}
                                    <span className="font-bold text-sm">{chainDisplay.name || "網路"}</span>
                                </>
                            );
                        })()}
                    </Button>
                    
                    {/* 網路選單 */}
                    {showNetworkMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg z-50">
                            <div className="p-2">
                                {Object.entries(CONFIG.CHAINS)
                                    .map(([key, chainConfig]) => {
                                        const chainDisplayName = key
                                            .split("_")
                                            .map(word => {
                                                const lower = word.toLowerCase();
                                                if (lower === "bsc") return "BSC";
                                                if (lower === "testnet" || lower === "test") return "Testnet";
                                                if (lower === "fuji") return "Fuji";
                                                if (lower === "amoy") return "Amoy";
                                                if (lower === "zetachain") return "ZetaChain";
                                                return word.charAt(0) + word.slice(1).toLowerCase();
                                            })
                                            .join(" ");
                                        const isActive = currentChainName === key;
                                        const chainLogo = "CHAIN_LOGO" in chainConfig ? chainConfig.CHAIN_LOGO : null;
                                        
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => handleNetworkSwitch(key as keyof typeof CONFIG.CHAINS)}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-100 transition-colors ${
                                                    isActive ? "bg-gray-200 font-bold" : ""
                                                }`}
                                            >
                                                {chainLogo && (
                                                    <img 
                                                        src={chainLogo} 
                                                        alt={chainDisplayName}
                                                        className="w-6 h-6 rounded-full"
                                                    />
                                                )}
                                                <span className="flex-1">{chainDisplayName}</span>
                                                {isActive && <span className="text-xs">✓</span>}
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
