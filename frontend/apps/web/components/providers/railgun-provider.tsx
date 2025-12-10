// apps/web/components/providers/railgun-provider.tsx
"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
//import { initializeEngine, loadEngineProvider } from "@/lib/railgun/wallet";
//import { setupBalanceListeners, triggerBalanceRefresh } from "@/lib/railgun/balance";
import { RailgunBalancesEvent } from "@railgun-community/shared-models";

// 定義 Context 的形狀
type RailgunContextType = {
  isReady: boolean;
  scanProgress: number; // 0 ~ 1 (代表 0% ~ 100%)
  balances: RailgunBalancesEvent | null; // 儲存最新的餘額物件
  refresh: () => void; // 提供一個手動重新整理的函數
};

const RailgunContext = createContext<RailgunContextType>({
  isReady: false,
  scanProgress: 0,
  balances: null,
  refresh: () => {},
});

export const useRailgun = () => useContext(RailgunContext);

export default function RailgunProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isReady, setIsReady] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [balances, setBalances] = useState<RailgunBalancesEvent | null>(null);

  useEffect(() => {
    const start = async () => {
      try {
        console.log("🔄 正在動態載入 Railgun SDK...");

        // ✅ 關鍵：在這裡動態 Import！
        // 這樣 Server Build 會直接忽略這些依賴
        const WalletModule = await import("@/lib/railgun/wallet");
        const BalanceModule = await import("@/lib/railgun/balance");

        // 1. 啟動引擎
        const engineSuccess = await WalletModule.initializeEngine();
        if (!engineSuccess) return;

        // 2. 設定監聽器
        BalanceModule.setupBalanceListeners(
          (progress) => setScanProgress(progress),
          (balanceEvent) => setBalances(balanceEvent)
        );

        // 3. 連接網路
        const networkSuccess = await WalletModule.loadEngineProvider();
        if (networkSuccess) {
          setIsReady(true);
        }
      } catch (err) {
        console.error("❌ Railgun SDK 載入失敗 (WASM 錯誤):", err);
      }
    };

    start();
  }, []);

  // 重新整理函數也需要動態載入
  const handleRefresh = async () => {
    const BalanceModule = await import("@/lib/railgun/balance");
    const walletId = localStorage.getItem("railgun_wallet_id");
    if (walletId) BalanceModule.triggerBalanceRefresh(walletId);
  };

  return (
    <RailgunContext.Provider value={{ 
      isReady, 
      scanProgress,
      balances, 
      refresh: handleRefresh 
    }}>
      {children}
    </RailgunContext.Provider>
  );
}