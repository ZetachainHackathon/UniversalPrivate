import { useCallback } from "react";
import { useWallet } from "@/components/providers/wallet-provider";
import { useConfirm } from "@/components/providers/confirm-dialog-provider";
import { CONFIG } from "@/config/env";
import { CONTENT } from "@/config/content";

/**
 * Hook to guard actions with network checks.
 * Prompts user to switch network if necessary.
 */
export const useNetworkGuard = () => {
    const { checkNetwork, switchNetwork } = useWallet();
    const { confirm } = useConfirm();

    const ensureNetwork = useCallback(async (requiredChainName: string): Promise<boolean> => {
        // 將鏈名稱轉換為 CONFIG.CHAINS 的 key 格式
        const chainKey = requiredChainName.toUpperCase().replace(/-/g, "_") as keyof typeof CONFIG.CHAINS;
        
        if (!(chainKey in CONFIG.CHAINS)) {
            console.error(`Unknown chain: ${requiredChainName}`);
            return false;
        }

        const chainConfig = CONFIG.CHAINS[chainKey];
        const requiredIdDec = BigInt(chainConfig.ID_DEC);
        const requiredIdHex = chainConfig.ID_HEX;
        
        // 生成確認訊息（使用鏈的顯示名稱）
        const chainDisplayName = chainKey
            .split("_")
            .map(word => {
                const lower = word.toLowerCase();
                if (lower === "bsc") return "BSC";
                if (lower === "testnet" || lower === "test") return "Testnet";
                if (lower === "fuji") return "Fuji";
                if (lower === "amoy") return "Amoy";
                if (lower === "zetachain") return "ZetaChain";
                return word.charAt(0) + word.slice(1).toLowerCase();
            })
            .join(" ");
        
        const confirmMessage = `請切換到 ${chainDisplayName} 網路以繼續操作。`;

        const isCorrect = await checkNetwork(requiredIdDec);
        if (isCorrect) return true;

        const confirmed = await confirm({
            title: CONTENT.WARNINGS.WRONG_NETWORK,
            description: confirmMessage,
            confirmText: CONTENT.ACTIONS.SWITCH_NETWORK
        });

        if (confirmed) {
            await switchNetwork(requiredIdHex);
            // We can't guarantee switch success immediately, but usually wallet handles it.
            // Returning false to indicate the *current* action should probably be aborted/retried
            // or we could optimistically return true if we assume switch happens.
            // Usually simpler to return false and let user click again or handle it.
            // But for better UX, we might want to wait? switchNetwork is async.
            // Let's assume after switchNetwork returns, we are good? 
            // Most wallets reload page on chain change, or update state.
            return false;
        }

        return false;
    }, [checkNetwork, switchNetwork, confirm]);

    return { ensureNetwork };
};
