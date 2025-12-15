import Link from "next/link";
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";
import { MnemonicExportModal } from "./mnemonic-export-modal";

export function CrossChainHeader() {
    const { isConnected, address, connectWallet } = useWallet();
    const { isReady: isRailgunReady, walletInfo } = useRailgun();

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`${label} 已複製！`);
    };

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
