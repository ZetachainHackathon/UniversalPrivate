import { groth16 } from 'snarkjs';
import {
    startRailgunEngine,
    getProver,
    SnarkJSGroth16,
    loadProvider
} from '@railgun-community/wallet';
import { createWebDatabase, clearWebDatabase } from './db'; // 👈 引用我們寫好的 Web DB
import { createWebArtifactStore } from './artifact-store'; // 👈 引用我們寫好的 Web Store
import {
    FallbackProviderJsonConfig,
    NETWORK_CONFIG,
    POIList
} from '@railgun-community/shared-models';
import { TEST_NETWORK, TEST_RPC_URL } from '@/constants';

import { setEngineLoggers } from './logger';

/**
 * 初始化 Railgun 引擎 (Web 版本)
 * 這個函數會被 railgun-provider.tsx 呼叫
 */
export const initializeEngine = async (): Promise<boolean> => {
    try {
        console.log("🚀 [Railgun] 正在初始化 Web Engine...");

        setEngineLoggers();

        // 0. 強制清除舊的資料庫 (避免 Stale Data)
        await clearWebDatabase('railgun-web-db');

        // 1. 設定錢包識別名稱 (可隨意改)
        const walletSource = "My Wallet";

        // 2. 設定資料庫 (使用 IndexedDB)
        const db = createWebDatabase('railgun-web-db');

        // Whether to forward Engine debug logs to Logger.
        const shouldDebug = true;

        // 3. 設定 Artifact Store (使用我們偽造的 Store，避免 fs 報錯)
        const artifactStore = createWebArtifactStore();

        // Whether to download native C++ or web-assembly artifacts.
        // True for mobile. False for nodejs and browser.
        const useNativeArtifacts = false;

        // Whether to skip merkletree syncs and private balance scans.
        // Only set to TRUE in shield-only applications that don't
        // load private wallets or balances.
        const skipMerkletreeScans = false;

        // 4. 設定 POI 節點 (驗證資金來源是否乾淨)
        // 這是官方測試用的節點，正式上線可能需要更換
        const poiNodeURLs: string[] = [
            "https://ppoi-agg.horsewithsixlegs.xyz",
        ];
        const customPOILists: POIList[] = [];

        // Set to true if you would like to view verbose logs for private balance and TXID scans
        const verboseScanLogging = true;

        // 5. 啟動引擎
        // 參數說明：
        // - useNativeArtifacts: 必須為 false (瀏覽器不支援 C++ 模組)
        // - skipMerkletreeScans: 設為 false 才能看到餘額
        await startRailgunEngine(
            walletSource,
            db,
            shouldDebug,            // shouldDebug (開發時建議開 true)
            artifactStore,   // 傳入 Web 專用 Store
            useNativeArtifacts,           // useNativeArtifacts (Web 必為 false)
            skipMerkletreeScans,           // skipMerkletreeScans
            poiNodeURLs,     // POI 節點
            customPOILists,  // 自定義清單
            verboseScanLogging             // verboseScanLogging (詳細日誌)
        );

        getProver().setSnarkJSGroth16(groth16 as unknown as SnarkJSGroth16);

        console.log("✅ [Railgun] Engine 初始化成功！");
        return true;

    } catch (error) {
        console.error("❌ [Railgun] Engine 初始化失敗:", error);
        return false;
    }
};

/**
 * 輔助函式：格式化 Provider 資訊
 */
const getProviderInfo = (providerUrl: string) => {
  return {
    provider: providerUrl,
    priority: 3,
    weight: 2,
    maxLogsPerBatch: 1,
  };
};

/**
 * 載入網路 Provider
 * 這會讓 Railgun 連接到我們指定的區塊鏈網路 (例如 ZetaChain Testnet)
 */
export const loadEngineProvider = async () => {
  try {
    console.log(`🚀 [Railgun] 正在連接網路: ${TEST_NETWORK}`);
    console.log(`🔗 RPC URL: ${TEST_RPC_URL}`);

    // 1. 確保 Chain ID 是數字 (ZetaChain Athens 是 7001)
    // 雖然 NETWORK_CONFIG 裡有，但為了避免型別錯誤，我們手動轉成 Number
    const chainIdNumber = Number(NETWORK_CONFIG[TEST_NETWORK].chain.id);
    
    // 🔍 Debug: 印出 Railgun 合約地址
    console.log("🔍 Railgun Contract Address:", NETWORK_CONFIG[TEST_NETWORK].proxyContract);
    console.log("🔍 Deployment Block:", NETWORK_CONFIG[TEST_NETWORK].deploymentBlock);

    // 2. 建構設定檔
    const providerConfig: FallbackProviderJsonConfig = {
      chainId: chainIdNumber, // 👈 這裡必須是 number 型別 (例如 7001)
      providers: [
        getProviderInfo(TEST_RPC_URL)
      ],
    };

    // 🔍 Debug: 印出設定檔檢查結構是否正確
    console.log("📡 Provider Config:", JSON.stringify(providerConfig, null, 2));
    console.log("🔗 Network:", TEST_NETWORK);

    // 2.5 檢查 RPC 是否可用
    try {
        console.log(`Testing RPC connection to ${TEST_RPC_URL}...`);
        const response = await fetch(TEST_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 })
        });
        if (!response.ok) {
            console.warn(`⚠️ RPC URL 回應非 200: ${response.status} ${response.statusText}`);
        } else {
            const data = await response.json();
            console.log(`✅ RPC 連線成功, Chain ID: ${data.result}`);
        }
    } catch (err) {
        console.error(`❌ RPC 連線失敗: ${TEST_RPC_URL}`, err);
    }

    const pollingInterval = 1000 * 60 * 1; 

    // 3. 載入
    await loadProvider(
      providerConfig, 
      TEST_NETWORK ,
      pollingInterval
    );

    console.log("✅ [Railgun] 網路連接成功！");
    return true;

  } catch (error: any) {
    console.error("❌ [Railgun] 網路連接失敗:", error);
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
    return false;
  }
};