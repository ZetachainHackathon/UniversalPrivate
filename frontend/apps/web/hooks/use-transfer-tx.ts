import { useState } from "react";
import { parseUnits, ZeroAddress } from "ethers";
import { executeCrossChainTransfer } from "@/lib/railgun/cross-chain-transfer";
import { executeTransfer as executeInternalTransfer, executeTransferFromEvm } from "@/lib/railgun/transfer";
import { CONFIG } from "@/config/env";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";
import { toast } from "@repo/ui/components/sonner";
import { CONTENT } from "@/config/content";
import { getTokenDecimals } from "@/lib/railgun/token-utils";

/**
 * 根據 chainId 獲取對應的 CONFIG.CHAINS key
 */
const getChainKeyFromChainId = (chainId: bigint): string | null => {
    for (const [key, config] of Object.entries(CONFIG.CHAINS)) {
        if (BigInt(config.ID_DEC) === chainId) {
            return key;
        }
    }
    return null;
};

interface UseTransferTxProps {
    recipient: string;
    amount: string;
    transferType: "internal" | "cross-chain";
    targetChain?: "sepolia" | "base-sepolia";
    tokenAddress: string;
    // password: string; // Removed: Logic moved to Context
}

export const useTransferTransaction = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState("");

    const { signer, isConnected, connectWallet, getCurrentChainId } = useWallet();
    const { walletInfo, encryptionKey } = useRailgun();

    const executeTransfer = async ({
        recipient,
        amount,
        transferType,
        targetChain,
        tokenAddress,
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

        // 3. 獲取當前連接的鏈 ID
        const currentChainId = await getCurrentChainId();
        if (!currentChainId) {
            toast.error("無法獲取當前鏈信息");
            return;
        }

        // 4. 判斷當前鏈類型
        const isZetachain = currentChainId === BigInt(CONFIG.CHAINS.ZETACHAIN.ID_DEC);
        const currentChainKey = getChainKeyFromChainId(currentChainId);

        setIsLoading(true);
        const toastId = toast.loading(CONTENT.TOASTS.PREPARING_TX);
        setTxHash("");

        try {
        // 驗證 tokenAddress
        if (!tokenAddress || tokenAddress === "__other__") {
            toast.error("請選擇有效的 Token", { id: toastId });
            return;
        }

        // 獲取 Token decimals
        if (!signer?.provider) {
            toast.error("無法獲取 Provider", { id: toastId });
            return;
        }
        
        const decimals = await getTokenDecimals(tokenAddress, signer.provider);
        const amountBigInt = parseUnits(amount, decimals);

            if (transferType === "internal") {
                // Internal Transfer (0zk -> 0zk)
                toast.loading(CONTENT.TOASTS.GENERATING_PROOF, { id: toastId });

                let txResponse;

                if (isZetachain) {
                    // 在 Zetachain 上直接執行
                    txResponse = await executeInternalTransfer(
                        walletId,
                        recipient,
                        amountBigInt,
                        tokenAddress, // 使用選擇的 Token 地址
                        encryptionKey, // Use Context Key
                        signer
                    );
                } else {
                    // 在其他鏈上透過 EVMAdapt 執行
                    if (!currentChainKey) {
                        toast.error(`不支援的鏈: ${currentChainId.toString()}`, { id: toastId });
                        return;
                    }

                    // 檢查該鏈是否支援 EVMAdapt
                    const chainConfig = CONFIG.CHAINS[currentChainKey as keyof typeof CONFIG.CHAINS];
                    if (!("EVM_ADAPT" in chainConfig) || !chainConfig.EVM_ADAPT) {
                        toast.error(`鏈 ${currentChainKey} 未配置 EVMAdapt 地址`, { id: toastId });
                        return;
                    }

                    txResponse = await executeTransferFromEvm(
                        walletId,
                        recipient,
                        amountBigInt,
                        tokenAddress, // 使用選擇的 Token 地址
                        encryptionKey, // Use Context Key
                        signer,
                        currentChainKey // 傳入大寫的 key，如 "SEPOLIA", "BASE_SEPOLIA"
                    );
                }

                toast.loading(CONTENT.TOASTS.TX_SUBMITTED, { id: toastId });
                setTxHash(txResponse.hash);
            } else {
                // Cross-Chain Transfer (0zk -> EVM)
                // 跨鏈轉帳必須在 Zetachain 上執行
                if (!isZetachain) {
                    toast.error("跨鏈轉帳需要在 Zetachain 網路上執行", { id: toastId });
                    return;
                }

                if (!targetChain) {
                    toast.error("請選擇目標鏈", { id: toastId });
                    return;
                }

                toast.loading(CONTENT.TOASTS.PREPARING_CROSS_CHAIN, { id: toastId });

                const tx = await executeCrossChainTransfer(
                    encryptionKey, // Use Context Key
                    walletId,
                    amount, // Pass string, not bigint
                    recipient,
                    signer,
                    targetChain,
                    tokenAddress // 傳入選擇的 Token 地址
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
