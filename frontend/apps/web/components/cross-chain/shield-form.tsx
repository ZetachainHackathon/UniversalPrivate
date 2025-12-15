import { useState, useEffect, useRef } from "react";
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

    // 可用的鏈列表
    const availableChains = [
        { value: "sepolia", name: "Sepolia Testnet", key: "SEPOLIA" },
        { value: "zetachain", name: "ZetaChain Testnet", key: "ZETACHAIN" },
    ];

    // 獲取當前鏈的 LOGO
    const getChainLogo = (chain: string) => {
        const chainKey = chain === "sepolia" ? "SEPOLIA" : "ZETACHAIN";
        if (chainKey in CONFIG.CHAINS) {
            const chainConfig = CONFIG.CHAINS[chainKey as keyof typeof CONFIG.CHAINS];
            return "CHAIN_LOGO" in chainConfig ? chainConfig.CHAIN_LOGO : null;
        }
        return null;
    };

    // 獲取當前 Token 的 LOGO
    const getTokenLogo = () => {
        if (tokenAddress === ZeroAddress) {
            // Native Token
            if (selectedChain === "sepolia") {
                return CONFIG.CHAINS.SEPOLIA.CHAIN_LOGO;
            } else {
                return CONFIG.CHAINS.ZETACHAIN.CHAIN_LOGO;
            }
        } else {
            return getTokenLogoUrl(tokenAddress);
        }
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
                                {availableChains.find(c => c.value === selectedChain)?.name || selectedChain}
                            </span>
                            <span className="text-gray-400">▼</span>
                        </button>
                        
                        {showChainMenu && (
                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                {availableChains.map((chain) => {
                                    const chainLogo = getChainLogo(chain.value);
                                    const isSelected = selectedChain === chain.value;
                                    return (
                                        <button
                                            key={chain.value}
                                            type="button"
                                            onClick={() => {
                                                handleChainChange(chain.value);
                                                setShowChainMenu(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                                                isSelected ? "bg-gray-200 font-bold" : ""
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
                                        ? `Native Token (${selectedChain === "sepolia" ? "ETH" : "ZETA"})`
                                        : "Test ERC20"}
                                    className="w-5 h-5 rounded-full"
                                />
                            )}
                            <span className="flex-1 text-left">
                                {tokenAddress === ZeroAddress
                                    ? `Native Token (${selectedChain === "sepolia" ? "ETH" : "ZETA"})`
                                    : "Test ERC20"}
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
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                                        tokenAddress === ZeroAddress ? "bg-gray-200 font-bold" : ""
                                    }`}
                                >
                                    {getChainLogo(selectedChain) && (
                                        <img 
                                            src={getChainLogo(selectedChain)!} 
                                            alt={`Native Token (${selectedChain === "sepolia" ? "ETH" : "ZETA"})`}
                                            className="w-6 h-6 rounded-full"
                                        />
                                    )}
                                    <span className="flex-1">
                                        Native Token ({selectedChain === "sepolia" ? "ETH" : "ZETA"})
                                    </span>
                                    {tokenAddress === ZeroAddress && <span className="text-xs">✓</span>}
                                </button>
                                
                                {/* Test ERC20 選項 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTokenAddress(CONFIG.CONTRACTS.TEST_ERC20);
                                        setShowTokenMenu(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                                        tokenAddress === CONFIG.CONTRACTS.TEST_ERC20 ? "bg-gray-200 font-bold" : ""
                                    }`}
                                >
                                    {getTokenLogoUrl(CONFIG.CONTRACTS.TEST_ERC20) && (
                                        <img 
                                            src={getTokenLogoUrl(CONFIG.CONTRACTS.TEST_ERC20)!} 
                                            alt="Test ERC20"
                                            className="w-6 h-6 rounded-full"
                                        />
                                    )}
                                    <span className="flex-1">Test ERC20</span>
                                    {tokenAddress === CONFIG.CONTRACTS.TEST_ERC20 && <span className="text-xs">✓</span>}
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono break-all">
                        Addr: {tokenAddress}
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="font-bold">金額 (Amount)</label>
                <div className="relative">
                    <input
                        type="number"
                        className="w-full p-4 border-2 border-black rounded-lg text-xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                        {tokenAddress === ZeroAddress
                            ? selectedChain === "sepolia"
                                ? "ETH"
                                : "ZETA"
                            : "ERC20"}
                    </span>
                </div>
                <p className="text-sm text-gray-500 text-right">
                    錢包餘額: {Number(liveBalance).toFixed(4)}{" "}
                    {tokenAddress === ZeroAddress
                        ? selectedChain === "sepolia"
                            ? "ETH"
                            : "ZETA"
                        : "ERC20"}
                </p>
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
