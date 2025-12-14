import { Button } from "@repo/ui/components/button";
import { CONFIG } from "@/config/env";
import { ZeroAddress } from "ethers";

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
    status: string;
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
    status,
}: ShieldFormProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="font-bold">選擇鏈 (Chain)</label>
                    <select
                        className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium"
                        value={selectedChain}
                        onChange={(e) => handleChainChange(e.target.value)}
                    >
                        <option value="sepolia">Sepolia Testnet</option>
                        <option value="zetachain">ZetaChain Testnet</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="font-bold">代幣 (Token)</label>
                    <select
                        className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium"
                        onChange={(e) => setTokenAddress(e.target.value)}
                        value={tokenAddress}
                    >
                        <option value={ZeroAddress}>
                            Native Token ({selectedChain === "sepolia" ? "ETH" : "ZETA"})
                        </option>
                        <option value={CONFIG.CONTRACTS.TEST_ERC20}>Test ERC20</option>
                    </select>
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
                {isLoading ? status : "執行 Shield (入金)"}
            </Button>
        </div>
    );
}
