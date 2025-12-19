import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@repo/ui/components/button";
import { CONFIG } from "@/config/env";
import { ZeroAddress } from "ethers";
import { getTokenLogoUrl } from "@/lib/railgun/token-utils";

interface ShieldFormProps {
    selectedChain: string;
    handleChainChange: (chain: string) => void;
    tokenAddress: string;
    setTokenAddress: (address: string) => void;
    amount: string;
    setAmount: (amount: string) => void;
    liveBalance: string;
    handleShield: () => void;
    isLoading: boolean;
}

export function ShieldForm({
    selectedChain,
    handleChainChange,
    tokenAddress,
    setTokenAddress,
    amount,
    setAmount,
    liveBalance,
    handleShield,
    isLoading,
}: ShieldFormProps) {
    const [showChainMenu, setShowChainMenu] = useState(false);
    const [showTokenMenu, setShowTokenMenu] = useState(false);
    const chainMenuRef = useRef<HTMLDivElement>(null);
    const tokenMenuRef = useRef<HTMLDivElement>(null);
    const [sliderValue, setSliderValue] = useState(0);

    const handlePercentageChange = (percent: number) => {
        setSliderValue(percent);
        if (liveBalance) {
            const balanceVal = parseFloat(liveBalance);
            if (!isNaN(balanceVal)) {
                const newAmount = (balanceVal * percent) / 100;
                // Use a reasonable precision, e.g. 6 decimal places to avoid float issues in UI
                setAmount(newAmount === 0 ? "" : parseFloat(newAmount.toFixed(6)).toString());
            }
        }
    };

    // 可用的鏈列表（支援所有 CONFIG.CHAINS 中的鏈）
    const availableChains = useMemo(() => {
        return Object.entries(CONFIG.CHAINS).map(([key, config]) => {
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

            return {
                key,
                value: key.toLowerCase().replace(/_/g, "-"),
                name: chainDisplayName,
                logo: "CHAIN_LOGO" in config ? config.CHAIN_LOGO : null,
            };
        });
    }, []);

    // 獲取當前鏈的 LOGO
    const getChainLogo = (chain: string) => {
        const chainKey = chain.toUpperCase().replace(/-/g, "_") as keyof typeof CONFIG.CHAINS;
        if (chainKey in CONFIG.CHAINS) {
            const chainConfig = CONFIG.CHAINS[chainKey];
            return "CHAIN_LOGO" in chainConfig ? chainConfig.CHAIN_LOGO : null;
        }
        return null;
    };

    // 獲取當前 Token 的 LOGO
    const getTokenLogo = () => {
        if (tokenAddress === ZeroAddress) {
            // Native Token - 根據選擇的鏈獲取對應的 LOGO
            const chainKey = selectedChain.toUpperCase().replace(/-/g, "_") as keyof typeof CONFIG.CHAINS;
            if (chainKey in CONFIG.CHAINS) {
                const chainConfig = CONFIG.CHAINS[chainKey];
                return "CHAIN_LOGO" in chainConfig ? chainConfig.CHAIN_LOGO : null;
            }
            return null;
        } else {
            return getTokenLogoUrl(tokenAddress);
        }
    };

    // 獲取當前鏈的原生代幣符號
    const getNativeTokenSymbol = () => {
        const chainKey = selectedChain.toUpperCase().replace(/-/g, "_") as keyof typeof CONFIG.CHAINS;
        if (chainKey === "ZETACHAIN") return "ZETA";
        if (chainKey.includes("SEPOLIA") || chainKey.includes("BASE") || chainKey.includes("ARBITRUM")) return "ETH";
        if (chainKey.includes("BSC")) return "BNB";
        if (chainKey.includes("AVALANCHE") || chainKey.includes("FUJI")) return "AVAX";
        if (chainKey.includes("POLYGON") || chainKey.includes("AMOY")) return "POL";
        if (chainKey.includes("KAIA")) return "KAIA";
        return "ETH"; // 預設
    };

    // 點擊外部關閉選單
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (chainMenuRef.current && !chainMenuRef.current.contains(event.target as Node)) {
                setShowChainMenu(false);
            }
            if (tokenMenuRef.current && !tokenMenuRef.current.contains(event.target as Node)) {
                setShowTokenMenu(false);
            }
        };

        if (showChainMenu || showTokenMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showChainMenu, showTokenMenu]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="font-bold">選擇鏈 (Chain)</label>
                    <div className="relative" ref={chainMenuRef}>
                        <button
                            type="button"
                            onClick={() => setShowChainMenu(!showChainMenu)}
                            className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
                        >
                            {getChainLogo(selectedChain) && (
                                <img
                                    src={getChainLogo(selectedChain)!}
                                    alt={availableChains.find(c => c.value === selectedChain)?.name || ""}
                                    className="w-5 h-5 rounded-full"
                                />
                            )}
                            <span className="flex-1 text-left">
                                {availableChains.find(c => c.value === selectedChain)?.name ||
                                    selectedChain.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                            </span>
                            <span className="text-gray-400">▼</span>
                        </button>

                        {showChainMenu && (
                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-60 overflow-y-auto">
                                {availableChains.map((chain) => {
                                    const chainLogo = chain.logo || getChainLogo(chain.value);
                                    const isSelected = selectedChain === chain.value;
                                    return (
                                        <button
                                            key={chain.key}
                                            type="button"
                                            onClick={() => {
                                                handleChainChange(chain.value);
                                                setShowChainMenu(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${isSelected ? "bg-gray-200 font-bold" : ""
                                                }`}
                                        >
                                            {chainLogo && (
                                                <img
                                                    src={chainLogo}
                                                    alt={chain.name}
                                                    className="w-6 h-6 rounded-full"
                                                />
                                            )}
                                            <span className="flex-1">{chain.name}</span>
                                            {isSelected && <span className="text-xs">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="font-bold">代幣 (Token)</label>
                    <div className="relative" ref={tokenMenuRef}>
                        <button
                            type="button"
                            onClick={() => setShowTokenMenu(!showTokenMenu)}
                            className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
                        >
                            {getTokenLogo() && (
                                <img
                                    src={getTokenLogo()!}
                                    alt={tokenAddress === ZeroAddress
                                        ? `Native Token (${getNativeTokenSymbol()})`
                                        : "Test ERC20"}
                                    className="w-5 h-5 rounded-full"
                                />
                            )}
                            <span className="flex-1 text-left">
                                {tokenAddress === ZeroAddress
                                    ? `Native Token (${getNativeTokenSymbol()})`
                                    : "Test ERC20"}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                                {tokenAddress === ZeroAddress
                                    ? "Native Token"
                                    : `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`}
                            </span>
                            <span className="text-gray-400">▼</span>
                        </button>

                        {showTokenMenu && (
                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                {/* Native Token 選項 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTokenAddress(ZeroAddress);
                                        setShowTokenMenu(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${tokenAddress === ZeroAddress ? "bg-gray-200 font-bold" : ""
                                        }`}
                                >
                                    {getTokenLogo() && (
                                        <img
                                            src={getTokenLogo()!}
                                            alt={`Native Token (${getNativeTokenSymbol()})`}
                                            className="w-6 h-6 rounded-full"
                                        />
                                    )}
                                    <span className="flex-1">
                                        Native Token ({getNativeTokenSymbol()})
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">
                                        Native Token
                                    </span>
                                    {tokenAddress === ZeroAddress && <span className="text-xs">✓</span>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <label className="font-bold">金額 (Amount)</label>
                    <p className="text-sm text-gray-500 font-mono">
                        Balance: {Number(liveBalance).toFixed(4)} {tokenAddress === ZeroAddress ? getNativeTokenSymbol() : "ERC20"}
                    </p>
                </div>

                <div className="relative">
                    <div className="relative">
                        <input
                            type="number"
                            className="w-full p-4 border-2 border-black rounded-lg text-xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20 pr-20 no-spinner"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                // Reset slider if manually typed
                                setSliderValue(0);
                            }}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                            {tokenAddress === ZeroAddress
                                ? getNativeTokenSymbol()
                                : "ERC20"}
                        </span>
                    </div>

                    {/* Slider & Percentage Buttons */}
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={sliderValue}
                                onChange={(e) => handlePercentageChange(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black border border-black"
                            />
                            <span className="font-mono font-bold w-12 text-right">{sliderValue}%</span>
                        </div>

                        <div className="flex gap-2">
                            {[25, 50, 75, 100].map((percent) => (
                                <button
                                    key={percent}
                                    type="button"
                                    onClick={() => handlePercentageChange(percent)}
                                    className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${sliderValue === percent
                                        ? "bg-black text-white border-black"
                                        : "bg-white text-black border-black hover:bg-gray-100"
                                        }`}
                                >
                                    {percent === 100 ? "Max" : `${percent}%`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <Button
                onClick={handleShield}
                disabled={isLoading}
                className="w-full py-6 text-xl font-bold bg-black text-white hover:bg-gray-800 border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all mt-4"
            >
                {isLoading ? "處理中..." : "執行 Shield (入金)"}
            </Button>
        </div>
    );
}
