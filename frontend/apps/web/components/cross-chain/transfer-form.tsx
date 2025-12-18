import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@repo/ui/components/button";
import { formatEther, ZeroAddress } from "ethers";
import { CONFIG } from "@/config/env";
import { getTokenSymbol, getTokenLogoUrl } from "@/lib/railgun/token-utils";

interface TransferFormProps {
    recipient: string;
    setRecipient: (recipient: string) => void;
    amount: string;
    setAmount: (amount: string) => void;
    tokenAddress: string;
    setTokenAddress: (address: string) => void;
    railgunAddress: string;
    balances: any;
    handleTransfer: () => void;
    isLoading: boolean;
}

export function TransferForm({
    recipient,
    setRecipient,
    amount,
    setAmount,
    tokenAddress,
    setTokenAddress,
    railgunAddress,
    balances,
    handleTransfer,
    isLoading,
}: TransferFormProps) {
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

    const [showTokenMenu, setShowTokenMenu] = useState(false);
    const tokenMenuRef = useRef<HTMLDivElement>(null);

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

    // 點擊外部關閉選單
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tokenMenuRef.current && !tokenMenuRef.current.contains(event.target as Node)) {
                setShowTokenMenu(false);
            }
        };

        if (showTokenMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showTokenMenu]);

    // 當有餘額時，自動設置第一個 Token 為預設值（僅在初始化時）
    useEffect(() => {
        if (tokensWithBalance.length > 0 && (tokenAddress === ZeroAddress || tokenAddress === "")) {
            setTokenAddress(tokensWithBalance[0].address);
        }
    }, [tokensWithBalance.length]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="font-bold">接收方 0zk 地址</label>
                <input
                    type="text"
                    placeholder="0zk..."
                    className="w-full p-4 border-2 border-black rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                />
            </div>

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
            </div>

            <Button
                onClick={() => handleTransfer()}
                disabled={isLoading}
                className="w-full py-6 text-xl font-bold bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mt-4"
            >
                {isLoading ? "處理中..." : "發送交易"}
            </Button>
        </div>
    );
}
