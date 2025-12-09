// apps/web/lib/railgun/balance.ts
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
import { TEST_NETWORK } from "@/constants";

/**
 * 設定餘額掃描的監聽器 (Callbacks)
 * 這個函數允許我們把 React 的 setState 函數傳進來，
 * 這樣當 SDK 掃描到新進度時，前端 UI 就會自動更新。
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

  // 3. 監聽餘額更新 (當掃描完成或發現新餘額時觸發)
  setOnBalanceUpdateCallback((balanceEvent: RailgunBalancesEvent) => {
    console.log("💰 餘額更新:", balanceEvent);
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
    await refreshBalances(chain, [walletId]);
  } catch (error) {
    console.error("❌ 掃描失敗:", error);
  }
};