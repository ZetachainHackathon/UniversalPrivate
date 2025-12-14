// apps/web/components/providers/railgun-provider.tsx
"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { BrowserStorage, STORAGE_KEYS } from "@/lib/storage";
import { useRailgunEngine } from "@/hooks/use-railgun-engine";
import { RailgunBalancesEvent } from "@railgun-community/shared-models";

// 定義 Context 的形狀
type RailgunContextType = {
  isReady: boolean;
  scanProgress: number; // 0 ~ 1 (代表 0% ~ 100%)
  balances: RailgunBalancesEvent | null; // 儲存最新的餘額物件
  refresh: () => void; // 提供一個手動重新整理的函數
  reset: () => void; // 重置狀態 (切換帳號用)
};

const RailgunContext = createContext<RailgunContextType>({
  isReady: false,
  scanProgress: 0,
  balances: null,
  refresh: () => { },
  reset: () => { },
});

export const useRailgun = () => useContext(RailgunContext);

export default function RailgunProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isReady, scanProgress, balances, setBalances, setScanProgress } = useRailgunEngine();

  // 重置狀態
  const reset = useCallback(() => {
    setBalances(null);
    setScanProgress(0);
  }, [setBalances, setScanProgress]);

  // 重新整理函數也需要動態載入
  const handleRefresh = async () => {
    const BalanceModule = await import("@/lib/railgun/balance");
    // Use BrowserStorage for type safety
    const walletId = BrowserStorage.get(STORAGE_KEYS.RAILGUN_WALLET_ID);
    if (walletId) BalanceModule.triggerBalanceRefresh(walletId);
  };

  return (
    <RailgunContext.Provider value={{
      isReady,
      scanProgress,
      balances,
      refresh: handleRefresh,
      reset
    }}>
      {children}
    </RailgunContext.Provider>
  );
}