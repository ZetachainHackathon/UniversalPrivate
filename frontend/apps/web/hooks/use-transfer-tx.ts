import { useState } from "react";
import { executeCrossChainTransfer } from "@/lib/railgun/cross-chain-transfer";
import { CONFIG } from "@/config/env";
import { Signer } from "ethers";

interface UseTransferTxProps {
    railgunAddress: string;
    walletId: string;
    recipient: string;
    amount: string;
    transferType: "internal" | "cross-chain";
    password: string;
    signer: any;
    isConnected: boolean;
    connectWallet: () => Promise<void>;
    checkNetwork: (chainId: bigint) => Promise<boolean>;
    switchNetwork: (chainIdHex: string) => Promise<void>;
}

export const useTransferTransaction = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [txHash, setTxHash] = useState("");

    const executeTransfer = async ({
        railgunAddress,
        walletId,
        recipient,
        amount,
        transferType,
        password,
        signer,
        isConnected,
        connectWallet,
        checkNetwork,
        switchNetwork
    }: UseTransferTxProps) => {
        if (!railgunAddress) return alert("請先解鎖 Railgun 錢包");
        if (!walletId) return alert("錢包 ID 遺失，請重新解鎖");
        if (!recipient) return alert("請輸入接收方地址");
        if (!amount) return alert("請輸入金額");

        if (transferType === "internal") {
            alert("轉帳給 0zk 地址功能開發中...");
            return;
        }

        if (transferType === "cross-chain") {
            if (!isConnected || !signer) {
                try { await connectWallet(); return; } catch (e) { return alert("連接錢包失敗"); }
            }

            // 檢查是否在 Sepolia (因為是從 Sepolia 出發)
            const isSepolia = await checkNetwork(BigInt(CONFIG.CHAINS.SEPOLIA.ID_DEC));
            if (!isSepolia) {
                if (confirm("跨鏈轉帳需在 Sepolia 網路上發起，是否切換？")) await switchNetwork(CONFIG.CHAINS.SEPOLIA.ID_HEX);
                return;
            }

            setIsLoading(true);
            setStatus("⏳ 正在準備跨鏈轉帳 (Unshield)...");
            setTxHash("");

            try {
                const tx = await executeCrossChainTransfer(
                    password,
                    walletId,
                    amount,
                    recipient,
                    signer
                );

                setStatus("✅ 交易已送出！等待上鏈...");
                await tx.wait();
                setTxHash(tx.hash);
                setStatus("🎉 跨鏈轉帳成功！");

                // 延遲更新餘額
                setTimeout(async () => {
                    const { triggerBalanceRefresh } = await import("@/lib/railgun/balance");
                    triggerBalanceRefresh(walletId).catch(console.error);
                }, 5000);

            } catch (error: any) {
                console.error(error);
                setStatus("❌ 交易失敗: " + (error.reason || error.message));
            } finally {
                setIsLoading(false);
            }
        }
    };

    return {
        executeTransfer,
        isLoading,
        status,
        txHash
    };
};
