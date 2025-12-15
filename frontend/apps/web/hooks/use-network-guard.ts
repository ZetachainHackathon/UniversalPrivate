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

    const ensureNetwork = useCallback(async (requiredChainName: "sepolia" | "zetachain"): Promise<boolean> => {
        let requiredIdDec: bigint;
        let requiredIdHex: string;
        let confirmMessage: string;

        if (requiredChainName === "sepolia") {
            requiredIdDec = BigInt(CONFIG.CHAINS.SEPOLIA.ID_DEC);
            requiredIdHex = CONFIG.CHAINS.SEPOLIA.ID_HEX;
            confirmMessage = CONTENT.WARNINGS.SWITCH_NETWORK_SEPOLIA;
        } else {
            requiredIdDec = BigInt(CONFIG.CHAINS.ZETACHAIN.ID_DEC);
            requiredIdHex = CONFIG.CHAINS.ZETACHAIN.ID_HEX;
            confirmMessage = CONTENT.WARNINGS.SWITCH_NETWORK_ZETACHAIN;
        }

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
