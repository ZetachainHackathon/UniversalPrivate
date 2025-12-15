import { useState } from "react";
import { parseUnits, isAddress, ZeroAddress, Signer } from "ethers";
import { executeCrossChainShield } from "@/lib/railgun/cross-chain-shield";
import { executeLocalShield } from "@/lib/railgun/shield";
import { CONFIG } from "@/config/env";
import { TEST_NETWORK } from "@/constants";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";
import { toast } from "@repo/ui/components/sonner";

import { useConfirm } from "@/components/providers/confirm-dialog-provider";
import { useNetworkGuard } from "@/hooks/use-network-guard";
import { CONTENT } from "@/config/content";

interface UseShieldTxProps {
    adaptAddress: string;
    tokenAddress: string;
    amount: string;
    selectedChain: string;
}

export const useShieldTransaction = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState("");

    const { signer, isConnected, connectWallet } = useWallet();
    const { walletInfo } = useRailgun();
    const { ensureNetwork } = useNetworkGuard();

    const executeShield = async ({
        adaptAddress,
        tokenAddress,
        amount,
        selectedChain,
    }: UseShieldTxProps) => {
        // 1. 檢查 Railgun 狀態
        const railgunAddress = walletInfo?.railgunAddress;
        if (!railgunAddress) {
            toast.error(CONTENT.ERRORS.RAILGUN_WALLET_LOCKED);
            return;
        }

        // 2. 檢查參數
        if (!isAddress(adaptAddress)) {
            toast.error(CONTENT.ERRORS.INVALID_CONTRACT_ADDRESS);
            return;
        }

        // 3. 檢查錢包連接
        if (!isConnected || !signer) {
            try { await connectWallet(); return; } catch (e) { toast.error(CONTENT.ERRORS.WALLET_NOT_CONNECTED); return; }
        }

        // 4. 根據選擇的鏈進行檢查
        const targetChain = selectedChain === "sepolia" ? "sepolia" : "zetachain";
        const isNetworkCorrect = await ensureNetwork(targetChain);
        if (!isNetworkCorrect) return;

        setIsLoading(true);
        const toastId = toast.loading(CONTENT.TOASTS.PREPARING_SHIELD);
        setTxHash("");

        try {
            const amountBigInt = parseUnits(amount, 18);

            let tx;
            if (selectedChain === "sepolia") {
                // Sepolia -> ZetaChain (Cross-Chain Shield)
                // 強制使用 Native Token (ETH) 支付
                tx = await executeCrossChainShield(
                    railgunAddress,
                    adaptAddress,
                    tokenAddress,
                    amountBigInt,
                    signer,
                    true
                );
            } else {
                // ZetaChain -> ZetaChain (Local Shield)
                let targetToken = tokenAddress;
                // 注意：這裡省略了如果 tokenAddress 是 ZeroAddress 需要處理的邏輯 (如前頁面註釋所述)

                tx = await executeLocalShield(
                    railgunAddress,
                    targetToken,
                    amountBigInt,
                    signer,
                    TEST_NETWORK // ZetaChain Testnet
                );
            }

            toast.loading(CONTENT.TOASTS.TX_SUBMITTED_WAITING, { id: toastId });
            await tx.wait();

            setTxHash(tx.hash);
            toast.success(CONTENT.TOASTS.SHIELD_SUCCESS, { id: toastId });

            // 交易成功後，延遲 5 秒觸發一次掃描
            if (walletInfo?.id) {
                setTimeout(async () => {
                    console.log("🔄 交易後觸發餘額更新...");
                    const { triggerBalanceRefresh } = await import("@/lib/railgun/balance");
                    triggerBalanceRefresh(walletInfo.id).catch(console.error);
                }, 5000);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(CONTENT.ERRORS.TX_FAILED + (error.reason || error.message), { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        executeShield,
        isLoading,
        txHash
    };
};
