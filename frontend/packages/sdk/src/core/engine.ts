import { groth16 } from 'snarkjs';
import {
  startRailgunEngine,
  stopRailgunEngine,
  getProver,
  SnarkJSGroth16,
  loadProvider,
  setLoggers,
  ArtifactStore
} from '@railgun-community/wallet';
import {
  FallbackProviderJsonConfig,
  NetworkName,
  POIList
} from '@railgun-community/shared-models';

export {
  getEngine,
  createRailgunWallet,
  overrideArtifact,
  getProver,
  gasEstimateForUnprovenTransfer,
  generateTransferProof,
  populateProvedTransfer,
  setOnUTXOMerkletreeScanCallback,
  setOnTXIDMerkletreeScanCallback,
  setOnBalanceUpdateCallback,
  refreshBalances,
  type SnarkJSGroth16,
} from '@railgun-community/wallet';

export interface RailgunEngineConfig {
  walletSource?: string;
  db: any; // LevelDown compatible
  artifactStore: ArtifactStore;
  shouldDebug?: boolean;
  useNativeArtifacts?: boolean;
  skipMerkletreeScans?: boolean;
  poiNodeURLs?: string[];
  customPOILists?: POIList[];
  verboseScanLogging?: boolean;
}

// Engine State Tracking
let engineState: "IDLE" | "INITIALIZING" | "INITIALIZED" = "IDLE";
let initializationPromise: Promise<void> | null = null;

export const setEngineLoggers = (verbose: boolean = false) => {
  const logMessage = (msg: any) => {
    if (verbose) {
      console.log(`[Engine Log] ${new Date().toISOString()}:`, msg);
    }
  };

  const logError = (msg: any) => {
    console.error(`[Engine Error] ${new Date().toISOString()}:`, msg);
  };

  setLoggers(logMessage, logError);
};

/**
 * Initialize Railgun Engine
 */
export const initializeEngine = async (config: RailgunEngineConfig): Promise<void> => {
  if (engineState === "INITIALIZED") {
    return;
  }

  if (engineState === "INITIALIZING" && initializationPromise) {
    return initializationPromise;
  }

  engineState = "INITIALIZING";

  initializationPromise = (async () => {
    try {
      setEngineLoggers(config.verboseScanLogging);

      const walletSource = config.walletSource ?? "Universal";
      const shouldDebug = config.shouldDebug ?? false;
      const useNativeArtifacts = config.useNativeArtifacts ?? false;
      const skipMerkletreeScans = config.skipMerkletreeScans ?? false;
      const poiNodeURLs = config.poiNodeURLs ?? [];
      const customPOILists = config.customPOILists ?? [];
      const verboseScanLogging = config.verboseScanLogging ?? false;

      await startRailgunEngine(
        walletSource,
        config.db,
        shouldDebug,
        config.artifactStore,
        useNativeArtifacts,
        skipMerkletreeScans,
        poiNodeURLs,
        customPOILists,
        verboseScanLogging
      );

      getProver().setSnarkJSGroth16(groth16 as unknown as SnarkJSGroth16);

      engineState = "INITIALIZED";
    } catch (error) {
      engineState = "IDLE";
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
};

export const stopEngine = async (): Promise<void> => {
  await stopRailgunEngine();
  engineState = "IDLE";
  initializationPromise = null;
};

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
}

export const loadEngineProvider = async (config: NetworkConfig): Promise<void> => {
  const providerConfig: FallbackProviderJsonConfig = {
    chainId: config.chainId,
    providers: [
      {
        provider: config.rpcUrl,
        priority: 1,
        weight: 2,
        maxLogsPerBatch: 10,
        stallTimeout: 2500,
      }
    ],
  };

  await loadProvider(
    providerConfig,
    config.name as NetworkName,
    1000 * 60
  );
};
