import { useState, useEffect, useRef } from "react";
import { RailgunBalancesEvent } from "@railgun-community/shared-models";

export function useRailgunEngine() {
    const [isReady, setIsReady] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [balances, setBalances] = useState<RailgunBalancesEvent | null>(null);
    // 保存所有 balanceBucket 的餘額，以便查詢
    const allBalancesRef = useRef<Map<string, RailgunBalancesEvent>>(new Map());

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
                        if (isMounted) {
                            console.log("💰 餘額更新事件:", {
                                balanceBucket: balanceEvent.balanceBucket,
                                chain: balanceEvent.chain,
                                erc20Amounts: balanceEvent.erc20Amounts.map((t: any) => ({
                                    tokenAddress: t.tokenAddress,
                                    amount: t.amount.toString(),
                                })),
                            });
                            
                            // 保存所有 balanceBucket 的餘額
                            allBalancesRef.current.set(balanceEvent.balanceBucket, balanceEvent);
                            
                            // 優先顯示 "Spendable" 的餘額，如果沒有則顯示其他 bucket
                            if (balanceEvent.balanceBucket === "Spendable") {
                                setBalances(balanceEvent);
                            } else {
                                // 如果當前沒有 Spendable 餘額，顯示最新的餘額
                                const spendableBalance = allBalancesRef.current.get("Spendable");
                                if (!spendableBalance) {
                                    setBalances(balanceEvent);
                                }
                            }
                        }
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
