import { groth16 } from 'snarkjs';
import {
  startRailgunEngine,
  stopRailgunEngine,
  getProver,
  SnarkJSGroth16,
  loadProvider
} from '@railgun-community/wallet';
import { createWebDatabase, clearWebDatabase } from './db';
import { createWebArtifactStore } from './artifact-store';
import {
  FallbackProviderJsonConfig,
  NETWORK_CONFIG,
  POIList,
  NetworkName
} from '@railgun-community/shared-models';
import { CONFIG } from '@/config/env';
import { setEngineLoggers } from './logger';

/**
 * 初始化 Railgun 引擎 (Web 版本)
 * @returns Promise<void> - resolves on success, rejects on failure
 */
export const initializeEngine = async (): Promise<void> => {
  try {
    console.log("🚀 [Railgun] 正在初始化 Web Engine...");

    setEngineLoggers();

    // 0. 強制清除舊的資料庫 (已移除，確保持久化)
    // await clearWebDatabase('railgun-web-db');

    // 1. 設定
    const walletSource = "Universal";
    const db = createWebDatabase('railgun-web-db');
    const shouldDebug = true;
    const artifactStore = createWebArtifactStore();
    const useNativeArtifacts = false;
    const skipMerkletreeScans = false;
    const poiNodeURLs: string[] = [
      "https://ppoi-agg.horsewithsixlegs.xyz",
    ];
    const customPOILists: POIList[] = [];
    const verboseScanLogging = true;

    // 2. 啟動引擎
    await startRailgunEngine(
      walletSource,
      db,
      shouldDebug,
      artifactStore,
      useNativeArtifacts,
      skipMerkletreeScans,
      poiNodeURLs,
      customPOILists,
      verboseScanLogging
    );

    getProver().setSnarkJSGroth16(groth16 as unknown as SnarkJSGroth16);

    console.log("✅ [Railgun] Engine 初始化成功！");
  } catch (error) {
    console.error("❌ [Railgun] Engine 初始化失敗:", error);
    throw error; // Rethrow to let caller handle
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
    // disablePolling: true, // 如果 RPC 有限制，可以考慮打開
  };
};

/**
 * 載入網路 Provider
 */
export const loadEngineProvider = async (): Promise<void> => {
  try {
    const { NAME, RPC_URL, CHAIN_ID } = CONFIG.NETWORK;
    console.log(`🚀 [Railgun] 正在連接網路: ${NAME}`);

    // 1. 建構設定檔
    const providerConfig: FallbackProviderJsonConfig = {
      chainId: CHAIN_ID,
      providers: [
        getProviderInfo(RPC_URL)
      ],
    };

    // 2. 檢查 RPC 是否可用
    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 })
      });
      if (!response.ok) {
        throw new Error(`RPC URL 回應非 200: ${response.status}`);
      }
    } catch (err) {
      console.warn(`⚠️ RPC 連線測試失敗 (可能是 CORS，嘗試繼續):`, err);
    }

    // 3. 載入
    await loadProvider(
      providerConfig,
      NAME as NetworkName,
      1000 * 60 // Polling interval
    );

    console.log("✅ [Railgun] 網路連接成功！");
  } catch (error: any) {
    console.error("❌ [Railgun] 網路連接失敗:", error);
    throw error;
  }
};

/**
 * 停止 Railgun 引擎
 */
export const stopEngine = async (): Promise<void> => {
  console.log("🛑 正在停止 Railgun Engine...");
  await stopRailgunEngine();
  console.log("✅ Engine 已停止");
};