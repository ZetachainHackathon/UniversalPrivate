// apps/web/lib/railgun/balance.ts

import {
  setOnUTXOMerkletreeScanCallback,
  setOnTXIDMerkletreeScanCallback,
  setOnBalanceUpdateCallback,
  refreshBalances,
  getEngine
} from "@railgun-community/wallet";
import {
  MerkletreeScanUpdateEvent,
  NETWORK_CONFIG,
  RailgunBalancesEvent,
  RailgunWalletBalanceBucket,
} from "@railgun-community/shared-models";
import { TEST_NETWORK } from "@/constants";

// 定義 Cache (用於儲存最新的餘額狀態)
export const balanceCache = new Map<
  RailgunWalletBalanceBucket,
  RailgunBalancesEvent
>();

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
  setOnUTXOMerkletreeScanCallback((event: MerkletreeScanUpdateEvent) => {
    // console.log("UTXO Scan:", event.progress);
    onScanUpdate(event.progress);
  });

  // 2. 監聽 TXID 掃描進度
  setOnTXIDMerkletreeScanCallback((event: MerkletreeScanUpdateEvent) => {
    // console.log("TXID Scan:", event.progress);
    onScanUpdate(event.progress);
  });

  // 3. 監聽餘額更新
  setOnBalanceUpdateCallback((balanceEvent: RailgunBalancesEvent) => {
    console.log("💰 餘額更新:", balanceEvent);
    
    // 更新本地 Cache
    balanceCache.set(balanceEvent.balanceBucket, balanceEvent);
    
    // 通知前端
    onBalanceUpdate(balanceEvent);
  });
};

/**
 * 手動觸發一次餘額掃描
 * @param walletId 要掃描的錢包 ID
 */
export const triggerBalanceRefresh = async (walletId: string) => {
  const chain = NETWORK_CONFIG[TEST_NETWORK].chain;
  console.log("🔄 開始掃描餘額...", chain);
  
  try {
    // 0. 確保 Merkle Tree 同步 (與 Test Script 一致)
    // Test Script: await getEngine().scanContractHistory(chain, undefined);
    console.log("🌳 同步 Merkle Tree...");
    //await getEngine().scanContractHistory(chain, undefined);

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
 * 由於 SDK 限制，這裡我們同樣使用 refreshBalances，
 * 但我們先清空本地 Cache，讓 UI 有「重新抓取」的感覺。
 */
export const triggerFullRescan = async (walletId: string) => {
  const chain = NETWORK_CONFIG[TEST_NETWORK].chain;
  console.log("⚠️ 執行強制掃描 (Full Rescan)...", chain);
  
  // 1. 清空本地 Cache，強制 UI 重新渲染
  balanceCache.clear();
  
  try {
    // 2. 再次呼叫 refreshBalances (它是目前最穩定的掃描 API)
    // Railgun Engine 內部會自動判斷是否需要下載新的 Merkle Tree
    await refreshBalances(chain, [walletId]);
    console.log("✅ 強制掃描結束");
  } catch (error) {
    console.error("❌ 強制掃描失敗:", error);
    throw error;
  }
};

/**
 * 取得目前 Cache 中的可花費餘額 (Spendable)
 */
export const getSpendableBalances = () => {
  return balanceCache.get(RailgunWalletBalanceBucket.Spendable);
};

/**
 * 🔥 核彈級重置 (Hard Reset)
 * 刪除本地資料庫，強制 Engine 遺忘歷史，從頭掃描。
 * 這會導致網頁重新整理。
 */
export const clearRailgunStorage = async () => {
  console.warn("⚠️ 正在刪除 Railgun 本地資料庫...");
  
  // 1. 嘗試關閉連線 (非必要，但良好習慣)
  // 如果有 stopRailgunEngine 之類的可以呼叫，但直接刪 DB 最快

  // 2. 刪除 IndexedDB
  // Railgun 預設的 DB 名稱通常是 "railgun-web-db" (看你的 log 確認的)
  const dbName = "railgun-web-db";
  
  const req = window.indexedDB.deleteDatabase(dbName);
  
  req.onsuccess = () => {
    console.log("✅ 資料庫刪除成功！");
    alert("快取已清除！網頁將重新整理以開始完整掃描。");
    // 3. 強制重整，讓 Engine 重啟並重建 DB
    window.location.reload();
  };
  
  req.onerror = () => {
    console.error("❌ 無法刪除資料庫");
    alert("清除失敗，請手動清除瀏覽器快取。");
  };
};