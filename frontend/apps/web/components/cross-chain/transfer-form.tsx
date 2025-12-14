import { Button } from "@repo/ui/components/button";
import { formatEther, ZeroAddress } from "ethers";
import { NETWORK_CONFIG, NetworkName } from "@railgun-community/shared-models";
import { TEST_NETWORK } from "@/constants";

interface TransferFormProps {
    transferType: "internal" | "cross-chain";
    setTransferType: (type: "internal" | "cross-chain") => void;
    recipient: string;
    setRecipient: (recipient: string) => void;
    amount: string;
    setAmount: (amount: string) => void;
    tokenAddress: string;
    railgunAddress: string;
    balances: any;
    handleTransfer: () => void;
    isLoading: boolean;
    status: string;
}

export function TransferForm({
    transferType,
    setTransferType,
    recipient,
    setRecipient,
    amount,
    setAmount,
    tokenAddress,
    railgunAddress,
    balances,
    handleTransfer,
    isLoading,
    status,
}: TransferFormProps) {
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
                        disabled
                    >
                        <option value="zetachain">ZetaChain Testnet</option>
                    </select>
                    <p className="text-xs text-gray-500">
                        目前僅支援 Sepolia -&gt; ZetaChain
                    </p>
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
                <label className="font-bold">金額 (Amount)</label>
                <div className="relative">
                    <input
                        type="number"
                        className="w-full p-4 border-2 border-black rounded-lg text-xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                        {tokenAddress === ZeroAddress ? "ETH" : "ERC20"}
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
                    {balances?.erc20Amounts.map((token: any) => {
                        const isEth =
                            token.tokenAddress.toLowerCase() === ZeroAddress.toLowerCase();
                        const symbol = isEth
                            ? "ETH"
                            : `Token (${token.tokenAddress.slice(0, 6)}...)`;
                        // 只顯示大於 0 的餘額
                        if (token.amount === 0n) return null;
                        return (
                            <p key={token.tokenAddress} className="text-sm text-gray-500">
                                {Number(formatEther(token.amount)).toFixed(4)} {symbol}
                            </p>
                        );
                    })}
                    {(!balances || balances.erc20Amounts.length === 0) && (
                        <p className="text-sm text-gray-500">0.0000 (No Balance)</p>
                    )}
                </div>
            </div>

            <Button
                onClick={handleTransfer}
                disabled={isLoading}
                className="w-full py-6 text-xl font-bold bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mt-4"
            >
                {isLoading ? status : "發送交易"}
            </Button>
        </div>
    );
}
