// main.ts
import {
  startRailgunEngine,
  stopRailgunEngine,
  getEngine,
  createRailgunWallet,
  setOnUTXOMerkletreeScanCallback,
  setOnTXIDMerkletreeScanCallback,
} from "@railgun-community/wallet";
import { createNodeDatabase } from "./db";
import { createArtifactStore } from "./artifact";
import type { POIList, RailgunBalancesEvent } from "@railgun-community/shared-models";
import { ChainType, NETWORK_CONFIG } from "@railgun-community/shared-models";
import { loadEngineProvider } from "./loadProvider";
import { TEST_ENCRYPTION_KEY, TEST_TOKEN ,TEST_NETWORK} from "./constants";
import { getProviderWallet } from "./wallet";
import { displaySpendableBalances, runBalancePoller, setupBalanceCallbacks, waitForBalancesLoaded } from "./balances";
  

/**
 * Initializes the RAILGUN engine with the specified configuration.
 *
 * This function sets up the RAILGUN privacy engine with necessary configurations for wallet management,
 * database storage, artifact handling, and Private Proof of Innocence (POI) verification.
 *
 * @remarks
 * - The engine requires a database for storing encrypted wallets
 * - Artifact files are downloaded and stored in a specified directory
 * - POI node URLs are used for verifying that funds are not from undesirable sources
 *
 * @returns A Promise that resolves when the engine is successfully initialized
 *
 * @example
 * ```typescript
 * await initializeEngine();
 * ```
 *
 * @see https://docs.railgun.org for more information about RAILGUN privacy system
 */
/**
 * Initializes the RAILGUN Engine with provided configuration.
 *
 * @param args - Optional initialization parameters
 * @param args.walletSource - Name for your wallet implementation. Maximum of 16 characters, lowercase.
 * @param args.dbPath - Path to LevelDOWN compatible database for storing encrypted wallets
 * @param args.artifactsPath - Persistent storage path for required Engine artifact files
 * @param args.ppoiNodes - Array of Private POI aggregator node URLs
 *
 * @remarks
 * - The engine requires a database for storing encrypted wallets
 * - Artifact files are downloaded and stored in a specified directory
 * - POI node URLs are used for verifying that funds are not from undesirable sources
 *
 * This function configures and starts the RAILGUN Engine with appropriate settings for
 * wallet identification, database storage, artifact management, and Private POI verification.
 * It also sets up a shutdown handler to properly stop the engine when the process is terminated.
 *
 * Private POI (Private Proof of Innocence) provides cryptographic assurance that funds
 * entering the RAILGUN smart contract are not from known undesirable sources. For more
 * information see: https://docs.railgun.org/wiki/assurance/private-proofs-of-innocence
 *
 * @returns Promise that resolves when the engine is initialized
 *
 * @example
 * ```typescript
 * await initializeEngine();
 * ```
 *
 * @see https://docs.railgun.org for more information about RAILGUN privacy system
 */
export const initializeEngine = async (args?: {
  walletSource?: string;
  dbPath?: string;
  artifactsPath?: string;
  ppoiNodes?: string[];
}): Promise<void> => {
  // Name for your wallet implementation.
  // Encrypted and viewable in private transaction history.
  // Maximum of 16 characters, lowercase.
  const walletSource = args?.walletSource ?? "quickstart demo";

  // LevelDOWN compatible database for storing encrypted wallets.
  const dbPath = args?.dbPath ?? "./engine.db";

  //   const db = new Level(dbPath);
  const db = createNodeDatabase(dbPath);

  // Whether to forward Engine debug logs to Logger.
  const shouldDebug = true;

  // Persistent store for downloading large artifact files required by Engine.
  const artifactPath = args?.artifactsPath ?? "artifacts-directory";
  const artifactStore = createArtifactStore(artifactPath);

  // Whether to download native C++ or web-assembly artifacts.
  // True for mobile. False for nodejs and browser.
  const useNativeArtifacts = false;

  // Whether to skip merkletree syncs and private balance scans.
  // Only set to TRUE in shield-only applications that don't
  // load private wallets or balances.
  const skipMerkletreeScans = false;

  // Array of aggregator node urls for Private Proof of Innocence (Private POI), in order of priority.
  // Only one is required. If multiple urls are provided, requests will fall back to lower priority aggregator nodes if primary request fails.
  // Please reach out in the RAILGUN builders groups for information on the public aggregator nodes run by the community.
  //
  // Private POI is a tool to give cryptographic assurance that funds
  // entering the RAILGUN smart contract are not from a known list
  // of transactions or actors considered undesirable by respective wallet providers.
  // For more information: https://docs.railgun.org/wiki/assurance/private-proofs-of-innocence
  // (additional developer information coming soon).

  // LEAVE THIS OUT IN PRODUCTION. This is a public aggregator node for testing purposes.
  const poiNodeURLs: string[] = args?.ppoiNodes ?? [
    "https://ppoi-agg.horsewithsixlegs.xyz",
  ];

  // Add a custom list to check Proof of Innocence against.
  // Leave blank to use the default list for the aggregator node provided.
  const customPOILists: POIList[] = [];

  // Set to true if you would like to view verbose logs for private balance and TXID scans
  const verboseScanLogging = true;

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
  process.on("SIGINT", async (sigint) => {
    console.log("EXIT DETECTED", sigint);
    await stopRailgunEngine();
    process.exit(0);
  });
};

const main = async () => {
  try {
    // Initialize RAILGUN Engine
    await initializeEngine();
    console.log("✅ RAILGUN Engine initialized");

    // Load Network
    await loadEngineProvider();
    console.log("✅ Network loaded");


    // Define Chain (Zetachain)
    const chain = NETWORK_CONFIG[TEST_NETWORK].chain;

    // Scan contract history (sync Merkletree)
    console.log("Starting contract history scan...");
    await getEngine().scanContractHistory(chain, undefined);
    console.log("Contract history scan started (this may take a while)");

    // Create wallet (use your mnemonic)
    const mnemonic = process.env.MNEMONIC || "test test test test test test test test test test test junk";
    
    
    console.log("Creating Railgun wallet...");
    const walletInfo = await createRailgunWallet(
      TEST_ENCRYPTION_KEY,
      mnemonic,
      undefined, // creationBlockNumbers
    );
    console.log("Wallet created:");
    console.log("   Wallet ID:", walletInfo.id);
    console.log("   Railgun Address:", walletInfo.railgunAddress);

    const { provider, wallet } = getProviderWallet();
    console.log("Public Wallet Address:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log("Zeta Balance:", balance.toString());   

    setupBalanceCallbacks();
    runBalancePoller([walletInfo.id]);
    await waitForBalancesLoaded();
    displaySpendableBalances();
  } catch (err) {
    console.error("Failed to initialize RAILGUN Engine:", err);
    process.exit(1);
  }
};

main();