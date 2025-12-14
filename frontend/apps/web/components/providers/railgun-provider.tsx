// apps/web/components/providers/railgun-provider.tsx
"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { BrowserStorage, STORAGE_KEYS } from "@/lib/storage";
import { useRailgunEngine } from "@/hooks/use-railgun-engine";
import { RailgunBalancesEvent } from "@railgun-community/shared-models";

// 定義 Wallet Info 形狀
export type RailgunWalletInfo = {
  id: string;
  railgunAddress: string;
};

// 定義 Context 的形狀
type RailgunContextType = {
  isReady: boolean;
  scanProgress: number; // 0 ~ 1 (代表 0% ~ 100%)
  balances: RailgunBalancesEvent | null; // 儲存最新的餘額物件
  walletInfo: RailgunWalletInfo | null;
  encryptionKey: string | null; // Session Cache for Password
  refresh: () => Promise<void>; // 提供一個手動重新整理的函數
  reset: () => void; // 重置狀態 (切換帳號用)
  login: (password: string) => Promise<void>;
  create: (password: string) => Promise<string>; // 回傳 mnemonic
};

const RailgunContext = createContext<RailgunContextType>({
  isReady: false,
  scanProgress: 0,
  balances: null,
  walletInfo: null,
  encryptionKey: null,
  refresh: async () => { },
  reset: () => { },
  login: async () => { },
  create: async () => { return ""; },
});

export const useRailgun = () => useContext(RailgunContext);

export default function RailgunProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isReady, scanProgress, balances, setBalances, setScanProgress } = useRailgunEngine();
  const [walletInfo, setWalletInfo] = useState<RailgunWalletInfo | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  // 重置狀態
  const reset = useCallback(() => {
    setBalances(null);
    setScanProgress(0);
    setWalletInfo(null);
    setEncryptionKey(null);
  }, [setBalances, setScanProgress]);

  // 重新整理函數
  const handleRefresh = useCallback(async () => {
    const BalanceModule = await import("@/lib/railgun/balance");
    const id = walletInfo?.id || BrowserStorage.get(STORAGE_KEYS.RAILGUN_WALLET_ID);
    if (id) {
      console.log("🔄 Triggering refresh for wallet:", id);
      BalanceModule.triggerBalanceRefresh(id).catch(console.error);
    }
  }, [walletInfo]);

  // 登入邏輯
  const login = async (password: string) => {
    const { loadPrivateWallet } = await import("@/lib/railgun/wallet-actions");
    reset(); // 先清除舊狀態
    const info = await loadPrivateWallet(password);
    setWalletInfo({ id: info.id, railgunAddress: info.railgunAddress });
    setEncryptionKey(password);

    // 登入後自動觸發一次掃描
    const BalanceModule = await import("@/lib/railgun/balance");
    await BalanceModule.triggerBalanceRefresh(info.id);
  };

  // 創建邏輯
  const create = async (password: string) => {
    const { createMnemonic, createPrivateWallet } = await import("@/lib/railgun/wallet-actions");
    const mnemonic = createMnemonic();
    const info = await createPrivateWallet(password, mnemonic);

    setWalletInfo({ id: info.id, railgunAddress: info.railgunAddress });
    setEncryptionKey(password);

    const BalanceModule = await import("@/lib/railgun/balance");
    await BalanceModule.triggerBalanceRefresh(info.id);

    return mnemonic;
  };

  return (
    <RailgunContext.Provider value={{
      isReady,
      scanProgress,
      balances,
      walletInfo,
      encryptionKey,
      refresh: handleRefresh,
      reset,
      login,
      create
    }}>
      {children}
    </RailgunContext.Provider>
  );
}