import { useState, useMemo, useEffect } from "react";
import { Button } from "@repo/ui/components/button";
import { formatEther, ZeroAddress, formatUnits } from "ethers";
import { NETWORK_CONFIG, NetworkName } from "@railgun-community/shared-models";
import { TEST_NETWORK } from "@/constants";
import { CONFIG } from "@/config/env";
import { getTokenSymbol, getAllConfiguredTokens, type TokenInfo } from "@/lib/railgun/token-utils";

interface TransferFormProps {
    transferType: "internal" | "cross-chain";
    setTransferType: (type: "internal" | "cross-chain") => void;
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
    targetChain: "sepolia" | "base-sepolia";
    setTargetChain: (chain: "sepolia" | "base-sepolia") => void;
}

export function TransferForm({
    transferType,
    setTransferType,
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
    targetChain,
    setTargetChain,
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

    // 獲取當前選擇的 Token 信息
    const selectedToken = useMemo(() => {
        if (!tokenAddress || tokenAddress === ZeroAddress || tokenAddress === "") {
            return { symbol: "WZETA", address: ZeroAddress };
        }
        
        return {
            symbol: getTokenSymbol(tokenAddress),
            address: tokenAddress,
        };
    }, [tokenAddress]);

    // 當有餘額時，自動設置第一個 Token 為預設值（僅在初始化時）
    useEffect(() => {
        if (tokensWithBalance.length > 0 && (tokenAddress === ZeroAddress || tokenAddress === "")) {
            setTokenAddress(tokensWithBalance[0].address);
        }
    }, [tokensWithBalance.length]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-4">
            <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input
                        type="radio"
                        name="txType"
                        className="w-5 h-5 accent-black"
                        checked={transferType === "internal"}
                        onChange={() => setTransferType("internal")}
                    />
                    轉給隱私地址 (0zk)
                </label>
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input
                        type="radio"
                        name="txType"
                        className="w-5 h-5 accent-black"
                        checked={transferType === "cross-chain"}
                        onChange={() => setTransferType("cross-chain")}
                    />
                    跨鏈轉帳 (Cross-Chain)
                </label>
            </div>

            {transferType === "cross-chain" && (
                <div className="space-y-2 p-4 bg-gray-100 border-2 border-black rounded-lg">
                    <label className="font-bold">目標鏈 (Target Chain)</label>
                    <select
                        className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium"
                        value={targetChain}
                        onChange={(e) => setTargetChain(e.target.value as "sepolia" | "base-sepolia")}
                    >
                        <option value="sepolia">Sepolia Testnet</option>
                        <option value="base-sepolia">Base Sepolia</option>
                    </select>
                </div>
            )}

            <div className="space-y-2">
                <label className="font-bold">
                    {transferType === "internal"
                        ? "接收方 0zk 地址"
                        : "接收方 EVM 地址 (0x...)"}
                </label>
                <input
                    type="text"
                    placeholder={transferType === "internal" ? "0zk..." : "0x..."}
                    className="w-full p-4 border-2 border-black rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <label className="font-bold">選擇代幣 (Select Token)</label>
                {tokensWithBalance.length > 0 ? (
                    <select
                        className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium"
                        value={tokenAddress && tokensWithBalance.find((t: { address: string; symbol: string; balance: bigint }) => t.address === tokenAddress) ? tokenAddress : tokensWithBalance[0]?.address || ""}
                        onChange={(e) => {
                            setTokenAddress(e.target.value);
                        }}
                    >
                        {tokensWithBalance.map((token: { address: string; symbol: string; balance: bigint }) => (
                            <option key={token.address} value={token.address}>
                                {token.symbol} ({formatEther(token.balance).slice(0, 8)})
                            </option>
                        ))}
                    </select>
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

                <div className="text-right mt-2">
                    <p className="text-sm text-gray-500 font-bold">隱私餘額 (Private):</p>
                    {railgunAddress && (
                        <p className="text-sm text-gray-700 font-mono mb-2">
                            railgun address{" "}
                            {NETWORK_CONFIG[TEST_NETWORK as NetworkName].proxyContract}
                        </p>
                    )}
                    {tokensWithBalance.map((token: { address: string; symbol: string; balance: bigint }) => {
                        const balance = Number(formatEther(token.balance));
                        return (
                            <p key={token.address} className="text-sm text-gray-500">
                                {balance.toFixed(4)} {token.symbol}
                            </p>
                        );
                    })}
                    {(!balances || balances.erc20Amounts.length === 0) && (
                        <p className="text-sm text-gray-500">0.0000 (No Balance)</p>
                    )}
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
