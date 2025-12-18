import {
  refreshBalances,
  setupBalanceListeners as sdkSetupBalanceListeners,
} from "@st99005912/universal-private-sdk";
import { clearWebDatabase } from "@st99005912/universal-private-sdk/web";
import {
  NETWORK_CONFIG,
  RailgunBalancesEvent,
} from "@railgun-community/shared-models";
import { CONFIG } from "@/config/env";
import { BrowserStorage, STORAGE_KEYS } from "@/lib/storage";

/**
 * 設定餘額掃描的監聽器 (Callbacks)
 * @param onScanUpdate - 當掃描進度更新時呼叫 (0.0 ~ 1.0)
 * @param onBalanceUpdate - 當餘額變動時呼叫
 */
export const setupBalanceListeners = (
  onScanUpdate: (progress: number) => void,
  onBalanceUpdate: (balanceEvent: RailgunBalancesEvent) => void
) => {
  return sdkSetupBalanceListeners(onScanUpdate, onBalanceUpdate);
};

/**
 * 手動觸發一次餘額掃描
 * @param walletId 要掃描的錢包 ID
 */
export const triggerBalanceRefresh = async (walletId: string) => {
  // @ts-ignore
  const chain = NETWORK_CONFIG[CONFIG.RAILGUN_NETWORK.NAME].chain;
  console.log("🔄 開始掃描餘額...", chain);

  try {
    // 這是一個 Promise，當掃描全部完成後才會 resolve
    await refreshBalances(chain, [walletId]);
    console.log("✅ 掃描完成！");
  } catch (error) {
    console.error("❌ 掃描失敗:", error);
    throw error;
  }
};

/**
 * 🔥 完整掃描 (Full Rescan)
 */
export const triggerFullRescan = async (walletId: string) => {
  // @ts-ignore
  const chain = NETWORK_CONFIG[CONFIG.RAILGUN_NETWORK.NAME].chain;
  console.log("⚠️ 執行強制掃描 (Full Rescan)...", chain);

  try {
    // 再次呼叫 refreshBalances (它是目前最穩定的掃描 API)
    await refreshBalances(chain, [walletId]);
    console.log("✅ 強制掃描結束");
  } catch (error) {
    console.error("❌ 強制掃描失敗:", error);
    throw error;
  }
};

/**
 * 🔥 核彈級重置 (Hard Reset)
 * 刪除本地資料庫，強制 Engine 遺忘歷史，從頭掃描。
 * 回傳 Promise，由調用者決定是否重新整理頁面。
 */
export const clearRailgunStorage = async (): Promise<void> => {
  console.warn("⚠️ 正在刪除 Railgun 本地資料庫...");
  
  // 1. 清除 LocalStorage 中的關鍵資料
  BrowserStorage.remove(STORAGE_KEYS.RAILGUN_WALLET_ID);
  BrowserStorage.remove(STORAGE_KEYS.RAILGUN_HASH_STORE);
  BrowserStorage.remove(STORAGE_KEYS.RAILGUN_SALT);

  // 2. 清除 Uniswap Pools 快取
  if (typeof window !== "undefined") {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("uniswap_pools_cache_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  // 3. 清除 IndexedDB
  const dbName = "railgun-web-db";
  return clearWebDatabase(dbName);
};