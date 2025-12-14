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

interface UseShieldTxProps {
    adaptAddress: string;
    tokenAddress: string;
    amount: string;
    selectedChain: string;
}

export const useShieldTransaction = () => {
    const [isLoading, setIsLoading] = useState(false);
    // const [status, setStatus] = useState(""); // Removed in favor of Toast
    const [txHash, setTxHash] = useState("");

    const { signer, isConnected, connectWallet, checkNetwork, switchNetwork } = useWallet();
    const { walletInfo } = useRailgun();
    const { confirm } = useConfirm();

    const executeShield = async ({
        adaptAddress,
        tokenAddress,
        amount,
        selectedChain,
    }: UseShieldTxProps) => {
        // 1. 檢查 Railgun 狀態
        const railgunAddress = walletInfo?.railgunAddress;
        if (!railgunAddress) {
            toast.error("請先解鎖 Railgun 錢包");
            return;
        }

        // 2. 檢查參數
        if (!isAddress(adaptAddress)) {
            toast.error("合約地址格式錯誤");
            return;
        }

        // 3. 檢查錢包連接
        if (!isConnected || !signer) {
            try { await connectWallet(); return; } catch (e) { toast.error("連接錢包失敗"); return; }
        }

        // 4. 根據選擇的鏈進行檢查
        if (selectedChain === "sepolia") {
            const isSepolia = await checkNetwork(BigInt(CONFIG.CHAINS.SEPOLIA.ID_DEC));
            if (!isSepolia) {
                const confirmed = await confirm({
                    title: "網路不符",
                    description: "此操作需要在 Sepolia 網路上進行。是否切換網路？",
                    confirmText: "切換網路"
                });
                if (confirmed) await switchNetwork(CONFIG.CHAINS.SEPOLIA.ID_HEX);
                return;
            }
        } else if (selectedChain === "zetachain") {
            const isZeta = await checkNetwork(BigInt(CONFIG.CHAINS.ZETACHAIN.ID_DEC));
            if (!isZeta) {
                const confirmed = await confirm({
                    title: "網路不符",
                    description: "此操作需要在 ZetaChain 網路上進行。是否切換網路？",
                    confirmText: "切換網路"
                });
                if (confirmed) await switchNetwork(CONFIG.CHAINS.ZETACHAIN.ID_HEX);
                return;
            }
        }

        setIsLoading(true);
        const toastId = toast.loading("正在準備 Shield 交易...");
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

            toast.loading("交易已送出！等待上鏈...", { id: toastId });
            await tx.wait();

            setTxHash(tx.hash);
            toast.success("Shield 成功！", { id: toastId });

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
            toast.error("交易失敗: " + (error.reason || error.message), { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        executeShield,
        isLoading,
        // status, // Removed
        txHash
    };
};
