import {
  setOnUTXOMerkletreeScanCallback,
  setOnTXIDMerkletreeScanCallback,
  setOnBalanceUpdateCallback,
  refreshBalances,
} from "@railgun-community/wallet";
import {
  MerkletreeScanUpdateEvent,
  NETWORK_CONFIG,
  RailgunBalancesEvent,
} from "@railgun-community/shared-models";
import { CONFIG } from "@/config/env";

/**
 * 設定餘額掃描的監聽器 (Callbacks)
 * @param onScanUpdate - 當掃描進度更新時呼叫 (0.0 ~ 1.0)
 * @param onBalanceUpdate - 當餘額變動時呼叫
 */
export const setupBalanceListeners = (
  onScanUpdate: (progress: number) => void,
  onBalanceUpdate: (balanceEvent: RailgunBalancesEvent) => void
) => {
  // 1. 監聽 UTXO 掃描進度
  const utxoListener = (event: MerkletreeScanUpdateEvent) => {
    onScanUpdate(event.progress);
  };
  setOnUTXOMerkletreeScanCallback(utxoListener);

  // 2. 監聽 TXID 掃描進度
  const txidListener = (event: MerkletreeScanUpdateEvent) => {
    onScanUpdate(event.progress);
  };
  setOnTXIDMerkletreeScanCallback(txidListener);

  // 3. 監聽餘額更新
  const balanceListener = (balanceEvent: RailgunBalancesEvent) => {
    console.log("💰 餘額更新:", balanceEvent);
    onBalanceUpdate(balanceEvent);
  };
  setOnBalanceUpdateCallback(balanceListener);

  // 回傳 cleanup function
  return () => {
    setOnUTXOMerkletreeScanCallback(() => { });
    setOnTXIDMerkletreeScanCallback(() => { });
    setOnBalanceUpdateCallback(() => { });
  };
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
  const dbName = "railgun-web-db";

  return new Promise((resolve, reject) => {
    const req = window.indexedDB.deleteDatabase(dbName);

    req.onsuccess = () => {
      console.log("✅ 資料庫刪除成功！");
      resolve();
    };

    req.onerror = () => {
      console.error("❌ 無法刪除資料庫");
      reject(new Error("無法刪除資料庫"));
    };
  });
};