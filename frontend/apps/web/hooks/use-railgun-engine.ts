import { useState, useEffect } from "react";
import { RailgunBalancesEvent } from "@railgun-community/shared-models";

export function useRailgunEngine() {
    const [isReady, setIsReady] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [balances, setBalances] = useState<RailgunBalancesEvent | null>(null);

    useEffect(() => {
        let cleanupListeners: (() => void) | undefined;
        let isMounted = true;

        const start = async () => {
            try {
                console.log("🔄 正在動態載入 Railgun SDK...");
                const WalletModule = await import("@/lib/railgun/wallet");
                const BalanceModule = await import("@/lib/railgun/balance");

                if (!isMounted) return;

                // 1. 啟動引擎
                await WalletModule.initializeEngine();
                if (!isMounted) return;

                // 2. 設定監聽器
                cleanupListeners = BalanceModule.setupBalanceListeners(
                    (progress) => {
                        if (isMounted) setScanProgress(progress);
                    },
                    (balanceEvent) => {
                        if (isMounted) setBalances(balanceEvent);
                    }
                );

                // 3. 連接網路
                await WalletModule.loadEngineProvider();

                if (isMounted) {
                    setIsReady(true);
                }

            } catch (err) {
                console.error("❌ Railgun SDK 載入失敗:", err);
            }
        };

        start();

        return () => {
            isMounted = false;
            if (cleanupListeners) cleanupListeners();
        };
    }, []);

    return { isReady, scanProgress, balances, setBalances, setScanProgress };
}
