import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Button } from "@repo/ui/components/button";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";
import { MnemonicExportModal } from "./mnemonic-export-modal";
import { CONFIG } from "@/config/env";

export function CrossChainHeader() {
    const { isConnected, address, connectWallet, currentChainId, currentChainName, switchNetwork } = useWallet();
    const { isReady: isRailgunReady, walletInfo } = useRailgun();
    const [showNetworkMenu, setShowNetworkMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

    // 點擊外部關閉選單
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowNetworkMenu(false);
            }
        };

        if (showNetworkMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showNetworkMenu]);

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

    return (
        <header className="w-full p-6 flex justify-between items-center bg-white border-b border-gray-200">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button className="h-10 w-10 p-0 border-2 border-black bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-lg flex items-center justify-center text-xl font-bold">
                        ←
                    </Button>
                </Link>
                {walletInfo?.railgunAddress ? (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 border-2 border-black px-4 py-2 rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="font-bold text-sm">
                                0zk: {walletInfo.railgunAddress.slice(0, 8)}...{walletInfo.railgunAddress.slice(-6)}
                            </span>
                            <button
                                onClick={() => copyToClipboard(walletInfo.railgunAddress, "0zk Address")}
                                className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded border border-black"
                            >
                                Copy
                            </button>
                        </div>
                        <MnemonicExportModal
                            trigger={
                                <button className="text-xs text-gray-500 underline mt-1 ml-1 hover:text-black text-left">
                                    Export Seed/助記詞
                                </button>
                            }
                        />
                        <button
                            onClick={handleHardReset}
                            className="text-xs text-red-500 underline mt-1 ml-1 hover:text-red-700 text-left font-bold"
                        >
                            Reset Cache/重置快取
                        </button>
                    </div>
                ) : (
                    // 尚未登入：不顯示登入框（因已移至首頁），只顯示提示或空
                    <div className="text-sm font-bold text-gray-400">
                        {isRailgunReady ? "Not Logged In" : "Initializing..."}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* 網路切換按鈕 */}
                <div className="relative" ref={menuRef}>
                    <Button
                        onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                        className="bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
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
                                    <span>{chainDisplay.name || "網路"}</span>
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

                {/* 連接錢包按鈕 */}
                <Button
                    onClick={() => {
                        connectWallet().catch((e) => {
                            console.error('connectWallet error:', e);
                        });
                    }}
                    className="bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                    {isConnected && address
                        ? `${address.slice(0, 6)}...${address.slice(-4)}`
                        : "錢包 (Connect)"}
                </Button>
            </div>
        </header>
    );
}
