import Link from "next/link";
import { Button } from "@repo/ui/components/button";

interface HeaderProps {
    railgunAddress: string;
    password: string;
    setPassword: (password: string) => void;
    handleLoadWallet: () => void;
    isConnected: boolean;
    address: string | null;
    connectWallet: () => void;
    handleHardReset: () => void;
    isRailgunReady: boolean;
}

export function CrossChainHeader({
    railgunAddress,
    password,
    setPassword,
    handleLoadWallet,
    isConnected,
    address,
    connectWallet,
    handleHardReset,
    isRailgunReady,
}: HeaderProps) {
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`${label} 已複製！`);
    };

    return (
        <header className="w-full p-6 flex justify-between items-center bg-white border-b border-gray-200">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button className="h-10 w-10 p-0 border-2 border-black bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-lg flex items-center justify-center text-xl font-bold">
                        ←
                    </Button>
                </Link>
                {railgunAddress ? (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 border-2 border-black px-4 py-2 rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="font-bold text-sm">
                                0zk: {railgunAddress.slice(0, 8)}...{railgunAddress.slice(-6)}
                            </span>
                            <button
                                onClick={() => copyToClipboard(railgunAddress, "0zk Address")}
                                className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded border border-black"
                            >
                                Copy
                            </button>
                        </div>
                        <button
                            onClick={() => alert("請實作匯出助記詞功能")}
                            className="text-xs text-gray-500 underline mt-1 ml-1 hover:text-black text-left"
                        >
                            Export Seed/助記詞
                        </button>
                        <button
                            onClick={handleHardReset}
                            className="text-xs text-red-500 underline mt-1 ml-1 hover:text-red-700 text-left font-bold"
                        >
                            Reset Cache/重置快取
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="password"
                            placeholder={isRailgunReady ? "輸入密碼解鎖 0zk" : "初始化中..."}
                            className="border-2 border-black rounded px-2 py-1 text-sm disabled:bg-gray-100"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={!isRailgunReady}
                        />
                        <Button
                            onClick={handleLoadWallet}
                            disabled={!isRailgunReady}
                            className="h-8 text-xs border-2 border-black bg-black text-white disabled:opacity-50"
                        >
                            {isRailgunReady ? "解鎖" : "..."}
                        </Button>
                    </div>
                )}
            </div>

            <Button
                onClick={connectWallet}
                className="bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
                {isConnected && address
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : "錢包 (Connect)"}
            </Button>
        </header>
    );
}
