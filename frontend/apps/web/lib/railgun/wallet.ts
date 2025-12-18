import {
  initializeEngine as sdkInitializeEngine,
  loadEngineProvider as sdkLoadEngineProvider,
  stopEngine as sdkStopEngine,
  RailgunEngineConfig
} from '@repo/sdk';
import { createWebDatabase, createWebArtifactStore } from '@repo/sdk/web';
import { CONFIG } from '@/config/env';
import { POIList } from '@railgun-community/shared-models';

/**
 * 初始化 Railgun 引擎 (Web 版本)
 * 使用 SDK 進行初始化
 * @returns Promise<void> - resolves on success, rejects on failure
 */
export const initializeEngine = async (): Promise<void> => {
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
  const verboseScanLogging = process.env.NODE_ENV === 'development';

  const config: RailgunEngineConfig = {
    walletSource,
    db,
    artifactStore,
    shouldDebug,
    useNativeArtifacts,
    skipMerkletreeScans,
    poiNodeURLs,
    customPOILists,
    verboseScanLogging
  };

  console.log("🚀 [Railgun] 正在初始化 Web Engine (via SDK)...");
  try {
    await sdkInitializeEngine(config);
    console.log("✅ [Railgun] Engine 初始化成功！");
  } catch (error) {
    console.error("❌ [Railgun] Engine 初始化失敗:", error);
    throw error;
  }
};

/**
 * 載入網路 Provider
 */
export const loadEngineProvider = async (): Promise<void> => {
  const { NAME, RPC_URL, CHAIN_ID } = CONFIG.RAILGUN_NETWORK;
  console.log(`🚀 [Railgun] 正在連接網路: ${NAME}`);

  // 檢查 RPC 是否可用
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

  try {
    await sdkLoadEngineProvider({
      name: NAME,
      rpcUrl: RPC_URL,
      chainId: CHAIN_ID
    });
    console.log("✅ [Railgun] 網路連接成功！");
  } catch (error) {
    console.error("❌ [Railgun] 網路連接失敗:", error);
    throw error;
  }
};

/**
 * 停止 Railgun 引擎
 */
export const stopEngine = async (): Promise<void> => {
  console.log("🛑 正在停止 Railgun Engine...");
  await sdkStopEngine();
  console.log("✅ Engine 已停止");
};
