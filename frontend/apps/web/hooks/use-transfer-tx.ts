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
import { useNetworkGuard } from "@/hooks/use-network-guard";
import { CONTENT } from "@/config/content";

interface UseTransferTxProps {
    recipient: string;
    amount: string;
    transferType: "internal" | "cross-chain";
    // password: string; // Removed: Logic moved to Context
}

export const useTransferTransaction = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState("");

    const { signer, isConnected, connectWallet } = useWallet();
    const { walletInfo, encryptionKey } = useRailgun();
    const { ensureNetwork } = useNetworkGuard();

    const executeTransfer = async ({
        recipient,
        amount,
        transferType,
    }: UseTransferTxProps) => {
        // 1. 基本檢查
        const railgunAddress = walletInfo?.railgunAddress;
        const walletId = walletInfo?.id;

        if (!railgunAddress || !walletId) { toast.error(CONTENT.ERRORS.RAILGUN_WALLET_LOCKED); return; }
        if (!encryptionKey) { toast.error(CONTENT.ERRORS.RAILGUN_WALLET_RELOGIN); return; }

        // 2. 連接檢查
        if (!isConnected || !signer) {
            try { await connectWallet(); return; } catch (e) { toast.error(CONTENT.ERRORS.WALLET_NOT_CONNECTED); return; }
        }

        // 3. 確保在 ZetaChain (Transfer 發生在 ZetaChain)
        const isNetworkCorrect = await ensureNetwork("zetachain");
        if (!isNetworkCorrect) return;

        setIsLoading(true);
        const toastId = toast.loading(CONTENT.TOASTS.PREPARING_TX);
        setTxHash("");

        try {
            const amountBigInt = parseUnits(amount, 18); // 假設都是 18 decimals, 優化時應動態獲取

            if (transferType === "internal") {
                // Internal Transfer (0zk -> 0zk)
                toast.loading(CONTENT.TOASTS.GENERATING_PROOF, { id: toastId });

                // Now passing signer for self-signing
                const txResponse = await executeInternalTransfer(
                    walletId,
                    recipient,
                    amountBigInt,
                    ZeroAddress, // 暫時只支援 ETH/Native
                    encryptionKey, // Use Context Key
                    signer
                );

                toast.loading(CONTENT.TOASTS.TX_SUBMITTED, { id: toastId });
                setTxHash(txResponse.hash);
            } else {
                // Cross-Chain Transfer (0zk -> EVM)
                toast.loading(CONTENT.TOASTS.PREPARING_CROSS_CHAIN, { id: toastId });

                const tx = await executeCrossChainTransfer(
                    encryptionKey, // Use Context Key
                    walletId,
                    amount, // Pass string, not bigint
                    recipient,
                    signer
                );

                setTxHash(tx.hash);
            }
            toast.success(CONTENT.TOASTS.TX_SUBMITTED, { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(CONTENT.ERRORS.TX_FAILED + (error.reason || error.message), { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        executeTransfer,
        isLoading,
        txHash
    };
};
