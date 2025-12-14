import { useEffect } from "react";
import { triggerBalanceRefresh } from "@/lib/railgun/balance";

export const useRailgunAutoScan = (walletId: string, intervalSeconds: number = 10) => {
    useEffect(() => {
        if (!walletId) return;

        let isScanning = false;
        const interval = setInterval(async () => {
            if (isScanning) return;
            isScanning = true;
            try {
                // console.log("⏰ 定時觸發餘額掃描...");
                await triggerBalanceRefresh(walletId);
            } catch (e) {
                console.error("掃描錯誤:", e);
            } finally {
                isScanning = false;
            }
        }, intervalSeconds * 1000);

        return () => clearInterval(interval);
    }, [walletId, intervalSeconds]);
};
