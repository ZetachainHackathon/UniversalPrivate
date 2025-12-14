import { useState } from "react";
import { parseUnits, isAddress, ZeroAddress } from "ethers";
import { executeLocalShield } from "@/lib/railgun/shield";
import { executeCrossChainTransfer } from "@/lib/railgun/cross-chain-transfer";
import { executeTransfer as executeInternalTransfer } from "@/lib/railgun/transfer";
import { CONFIG } from "@/config/env";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";
import { toast } from "@repo/ui/components/sonner";

import { useConfirm } from "@/components/providers/confirm-dialog-provider";

interface UseTransferTxProps {
    recipient: string;
    amount: string;
    transferType: "internal" | "cross-chain";
    // password: string; // Removed: Logic moved to Context
}

export const useTransferTransaction = () => {
    const [isLoading, setIsLoading] = useState(false);
    // const [status, setStatus] = useState("");
    const [txHash, setTxHash] = useState("");

    const { signer, isConnected, connectWallet, checkNetwork, switchNetwork } = useWallet();
    const { walletInfo, encryptionKey } = useRailgun();
    const { confirm } = useConfirm();

    const executeTransfer = async ({
        recipient,
        amount,
        transferType,
    }: UseTransferTxProps) => {
        // 1. 基本檢查
        const railgunAddress = walletInfo?.railgunAddress;
        const walletId = walletInfo?.id;

        if (!railgunAddress || !walletId) { toast.error("請先解鎖 Railgun 錢包"); return; }
        if (!encryptionKey) { toast.error("錢包鎖定中，請重新登入"); return; } // Password is now encryptionKey

        // 2. 連接檢查
        if (!isConnected || !signer) {
            try { await connectWallet(); return; } catch (e) { toast.error("連接錢包失敗"); return; }
        }

        // 3. 確保在 ZetaChain (Transfer 發生在 ZetaChain)
        // 注意：這裡假設 0zk Transfer 都在 ZetaChain 發生。如果是跨鏈，則需根據目標鏈判斷。
        // 目前需求：Sepolia -> Zeta (Shield), Zeta -> Zeta (Transfer), Zeta -> Others (Unshield?)
        // Transfer 通常是在 Privacy Pool 所在的鏈。
        const isZeta = await checkNetwork(BigInt(CONFIG.CHAINS.ZETACHAIN.ID_DEC));
        if (!isZeta) {
            const confirmed = await confirm({
                title: "網路不符",
                description: "此操作需要在 ZetaChain 網路上進行。是否切換網路？",
                confirmText: "切換網路"
            });
            if (confirmed) {
                await switchNetwork(CONFIG.CHAINS.ZETACHAIN.ID_HEX);
            }
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading("正在準備交易...");
        setTxHash("");

        try {
            const amountBigInt = parseUnits(amount, 18); // 假設都是 18 decimals, 優化時應動態獲取

            if (transferType === "internal") {
                // Internal Transfer (0zk -> 0zk)
                toast.loading("生成零知識證明...", { id: toastId });
                // 這裡我們直接呼叫 lib 函數，不需要 signer (因為是 Relayer 發送? 還是 Self-Sign?)
                // executeInternalTransfer 通常需要 Wallet ID 和 Password 生成 Proof
                // 然後需要 Relayer 或者 Self-Sign. 這裡假設 Self-Sign 需要 Ethers Signer?
                // 原本程式碼並沒有傳 Signer 給 executeInternalTransfer??? 
                // 檢查原代碼: executeInternalTransfer(walletId, recipient, amount, token, password)
                // 它的確只用 wallet 內部邏輯。

                // TODO: 這裡如果是 Self-Sign，其實需要 gas。目前的實作可能是透過 Relayer 或者直接用 wallet 發送？
                // 暫時維持原狀。

                // Now passing signer for self-signing
                const txResponse = await executeInternalTransfer(
                    walletId,
                    recipient,
                    amountBigInt,
                    ZeroAddress, // 暫時只支援 ETH/Native
                    encryptionKey, // Use Context Key
                    signer
                );

                toast.loading("交易已送出！", { id: toastId });
                setTxHash(txResponse.hash);
            } else {
                // Cross-Chain Transfer (0zk -> EVM via Unshield? Or just Standard Transfer?)
                // 此處根據原代碼是 executeCrossChainTransfer
                toast.loading("準備跨鏈轉帳...", { id: toastId });
                // Note: CrossChainTransfer implementation needs review on arguments
                const tx = await executeCrossChainTransfer(
                    encryptionKey, // Use Context Key
                    walletId,
                    amount, // Pass string, not bigint
                    recipient,
                    signer
                );

                // setTxHash(tx.hash);
            }
            toast.success("交易成功 (模擬/實作中)", { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error("交易失敗: " + (error.reason || error.message), { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        executeTransfer,
        isLoading,
        // status,
        txHash
    };
};
