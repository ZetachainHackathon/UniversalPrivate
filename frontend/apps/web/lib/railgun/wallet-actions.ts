import { Mnemonic, randomBytes } from "ethers";
import {
  createRailgunWallet,
  loadWalletByID,
  getWalletShareableViewingKey,
  createViewOnlyRailgunWallet
} from "@railgun-community/wallet";
import {
  NETWORK_CONFIG,
  NetworkName,
  type RailgunWalletInfo
} from "@railgun-community/shared-models";

// 👇 引入我們之前寫好的模組
import { getEncryptionKeyFromPassword, setEncryptionKeyFromPassword } from "./encryption";
import { CONFIG } from "@/config/env";
import { createWebDatabase, clearWebDatabase } from './db';
import { BrowserStorage, STORAGE_KEYS } from "@/lib/storage";

// 👇 引入 Engine Lifecycle 控制
import { stopEngine, initializeEngine, loadEngineProvider } from "./wallet";

/**
 * 取得當前網路的起始區塊 (優化掃描速度)
 */
const getCreationBlockMap = () => {
  // @ts-ignore
  const { deploymentBlock } = NETWORK_CONFIG[CONFIG.NETWORK.NAME];
  return {
    [CONFIG.NETWORK.NAME]: deploymentBlock ?? 0,
  };
};

/**
 * 產生新的 12 個字助記詞
 */
export const createMnemonic = (): string => {
  return Mnemonic.fromEntropy(randomBytes(16)).phrase.trim();
};

/**
 * 輔助函式：取得 Encryption Key
 * 如果有儲存過就讀取，沒有就回傳 null (讓 UI 決定要不要報錯)
 */
const getEncryptionKey = async (password: string): Promise<string> => {
  try {
    return await getEncryptionKeyFromPassword(password);
  } catch (err) {
    console.warn("無法取得加密金鑰，可能是尚未設定密碼");
    throw err;
  }
};

/**
 * 創建 Railgun 隱私錢包
 * * @param password 使用者輸入的密碼 (用來產生加密金鑰)
 * @param mnemonic 助記詞
 * @returns 錢包資訊 (包含 ID)
 */
export const createPrivateWallet = async (
  password: string,
  mnemonic: string
): Promise<RailgunWalletInfo> => {

  // 0. 核彈級重置：停止引擎 -> 清除 DB -> 重啟引擎
  // 這是為了確保 "同助記詞 = 同地址" 的絕對決定性 (Determinism)
  try {
    if (typeof window !== 'undefined') {
      await stopEngine(); // Release DB locks
      await clearWebDatabase('railgun-web-db'); // Wipe Data
      await initializeEngine(); // Restart
      await loadEngineProvider(); // Reconnect Network
    }
  } catch (e) {
    console.warn("重置流程遇到問題 (可能是 Engine 尚未啟動)，嘗試繼續...", e);
    // 即便失敗也嘗試繼續，也許只是 Engine 沒開
    try { await initializeEngine(); } catch { }
  }

  // 1. 取得加密金鑰 (假設使用者已經註冊過密碼，或者你可以在這裡呼叫 setEncryptionKey)
  // 如果是全新的流程，這裡應該呼叫 setEncryptionKeyFromPassword
  let encryptionKey: string;
  try {
    encryptionKey = await getEncryptionKeyFromPassword(password);
  } catch (e) {
    // 如果找不到金鑰，代表是第一次使用，我們幫他設定
    console.log("偵測到新用戶，正在設定加密金鑰...");
    encryptionKey = await setEncryptionKeyFromPassword(password);
  }

  // 2. 設定掃描起始區塊
  const creationBlockMap = getCreationBlockMap();

  // 3. 呼叫 SDK 創建錢包
  console.log("正在創建 Railgun 錢包...");
  const formattedMnemonic = mnemonic.trim(); // 去除前後空白，避免複製貼上時多出空格

  // Debug: 檢查助記詞一致性
  console.log("🔍 Mnemonic Debug:");
  console.log("   - Original Length:", mnemonic.length);
  console.log("   - Trimmed Length:", formattedMnemonic.length);
  console.log("   - First Word:", formattedMnemonic.split(' ')[0]);
  console.log("   - Last Word:", formattedMnemonic.split(' ').pop());

  const railgunWalletInfo = await createRailgunWallet(
    encryptionKey,
    formattedMnemonic,
    creationBlockMap
  );

  // 4. 將 Wallet ID 存入 LocalStorage (方便下次自動載入)
  BrowserStorage.set(STORAGE_KEYS.RAILGUN_WALLET_ID, railgunWalletInfo.id);

  console.log("✅ 錢包創建成功 ID:", railgunWalletInfo.id);
  console.log("🔑 Railgun Address:", railgunWalletInfo.railgunAddress); // 讓用戶確認地址一致

  return railgunWalletInfo;
};

/**
 * 載入已存在的 Railgun 錢包
 * * @param password 使用者輸入的密碼
 * @returns 錢包資訊
 */
export const loadPrivateWallet = async (
  password: string
): Promise<RailgunWalletInfo> => {

  // 1. 從 LocalStorage 取得上次的 Wallet ID
  const walletId = BrowserStorage.get(STORAGE_KEYS.RAILGUN_WALLET_ID);
  if (!walletId) {
    throw new Error("找不到錢包 ID，請先創建錢包。");
  }

  // 2. 取得加密金鑰
  const encryptionKey = await getEncryptionKeyFromPassword(password);

  // 3. 載入錢包
  // isViewOnly: false (因為我們有私鑰，可以發送交易)
  const walletInfo = await loadWalletByID(encryptionKey, walletId, false);

  console.log("✅ 錢包載入成功:", walletInfo.id);
  return walletInfo;
};

// =========================================================
// 👇 View-Only Wallet Actions (只讀錢包功能)
// =========================================================

/**
 * 產生「可分享的查看金鑰 (Shareable Viewing Key)」
 * 前提：你的全功能錢包必須已經載入在 Engine 中
 * * @param walletId 你的全功能錢包 ID
 */
export const generateViewKey = async (walletId: string): Promise<string> => {
  try {
    const viewKey = await getWalletShareableViewingKey(walletId);
    return viewKey;
  } catch (error: any) {
    console.error("產生 View Key 失敗:", error);
    throw new Error("無法產生查看金鑰，請確認錢包已登入。");
  }
};

/**
 * 匯入/創建「只讀錢包」
 * 使用別人給你的 View Key 來創建一個只能看的錢包
 * * @param password 你的密碼 (用來加密這個只讀錢包存入 DB)
 * @param shareableViewKey 對方給的查看金鑰
 */
export const createViewOnlyWallet = async (
  password: string,
  shareableViewKey: string
): Promise<RailgunWalletInfo> => {

  // 1. 取得加密金鑰
  const encryptionKey = await getEncryptionKeyFromPassword(password);

  // 2. 創建只讀錢包
  // creationBlockNumberMap 這裡傳 undefined，代表從頭開始掃描 (比較慢但最保險)
  const walletInfo = await createViewOnlyRailgunWallet(
    encryptionKey,
    shareableViewKey,
    undefined
  );

  console.log("✅ 只讀錢包創建成功 ID:", walletInfo.id);
  return walletInfo;
};

/**
 * 載入已存在的「只讀錢包」
 * * @param password 你的密碼
 * @param walletId 只讀錢包的 ID
 */
export const loadViewOnlyWallet = async (
  password: string,
  walletId: string
): Promise<RailgunWalletInfo> => {

  const encryptionKey = await getEncryptionKeyFromPassword(password);

  // ⚠️ 關鍵差異：第三個參數 isViewOnly 必須為 true
  const walletInfo = await loadWalletByID(
    encryptionKey,
    walletId,
    true // <--- 這代表載入的是只讀錢包 (沒有 Spending Key)
  );

  console.log("✅ 只讀錢包載入成功:", walletInfo.id);
  return walletInfo;
};