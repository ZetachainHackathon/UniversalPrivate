import { useState } from "react";
import { parseUnits, isAddress, ZeroAddress, Signer } from "ethers";
import { executeCrossChainShield } from "@/lib/railgun/cross-chain-shield";
import { executeLocalShield } from "@/lib/railgun/shield";
import { CONFIG } from "@/config/env";
import { TEST_NETWORK } from "@/constants";

interface UseShieldTxProps {
    railgunAddress: string;
    adaptAddress: string;
    tokenAddress: string;
    amount: string;
    selectedChain: string;
    signer: any;
    isConnected: boolean;
    connectWallet: () => Promise<void>;
    checkNetwork: (chainId: bigint) => Promise<boolean>;
    switchNetwork: (chainIdHex: string) => Promise<void>;
    walletId: string;
}

export const useShieldTransaction = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [txHash, setTxHash] = useState("");

    const executeShield = async ({
        railgunAddress,
        adaptAddress,
        tokenAddress,
        amount,
        selectedChain,
        signer,
        isConnected,
        connectWallet,
        checkNetwork,
        switchNetwork,
        walletId
    }: UseShieldTxProps) => {
        if (!railgunAddress) return alert("請先解鎖 Railgun 錢包");
        if (!isAddress(adaptAddress)) return alert("合約地址格式錯誤");

        if (!isConnected || !signer) {
            try { await connectWallet(); return; } catch (e) { return alert("連接錢包失敗"); }
        }

        // 根據選擇的鏈進行檢查
        if (selectedChain === "sepolia") {
            const isSepolia = await checkNetwork(BigInt(CONFIG.CHAINS.SEPOLIA.ID_DEC));
            if (!isSepolia) {
                if (confirm("切換至 Sepolia 網路？")) await switchNetwork(CONFIG.CHAINS.SEPOLIA.ID_HEX);
                return;
            }
        } else if (selectedChain === "zetachain") {
            const isZeta = await checkNetwork(BigInt(CONFIG.CHAINS.ZETACHAIN.ID_DEC));
            if (!isZeta) {
                if (confirm("切換至 ZetaChain 網路？")) await switchNetwork(CONFIG.CHAINS.ZETACHAIN.ID_HEX);
                return;
            }
        }

        setIsLoading(true);
        setStatus("⏳ 正在準備 Shield 交易...");
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

            setStatus("✅ 交易已送出！等待上鏈...");
            await tx.wait();
            setTxHash(tx.hash);
            setStatus("🎉 Shield 成功！");

            // 交易成功後，延遲 5 秒觸發一次掃描
            if (walletId) {
                setTimeout(async () => {
                    console.log("🔄 交易後觸發餘額更新...");
                    const { triggerBalanceRefresh } = await import("@/lib/railgun/balance");
                    triggerBalanceRefresh(walletId).catch(console.error);
                }, 5000);
            }
        } catch (error: any) {
            console.error(error);
            setStatus("❌ 交易失敗: " + (error.reason || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    return {
        executeShield,
        isLoading,
        status,
        txHash
    };
};
