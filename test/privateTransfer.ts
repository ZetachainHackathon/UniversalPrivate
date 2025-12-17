
import {
  NetworkName,
  NETWORK_CONFIG,
  type RailgunWalletInfo,
  type POIList,
} from "@railgun-community/shared-models";
import {
  initializeEngine as sdkInitializeEngine,
  stopEngine,
  loadEngineProvider as sdkLoadEngineProvider,
  generateTransferTransaction,
  createRailgunWallet,
  overrideArtifact,
  getEngine,
} from "@repo/sdk";
import { createNodeDatabase, createNodeArtifactStore } from "@repo/sdk/node";
import { TEST_ENCRYPTION_KEY, TEST_NETWORK, ZETACHAIN_DEPLOYMENT_NETWORK, SEPOLIA_DEPLOYMENT_NETWORK, TEST_RPC_URL } from "./constants";
import { getProviderWallet, getSepoliaWallet } from "./wallet";
import { Contract } from "ethers";
import { getArtifact, listArtifacts } from "railgun-circuit-test-artifacts";
import { setupNodeGroth16 } from "./prover";
import { setupBalanceCallbacks, runBalancePoller, waitForBalancesLoaded, displaySpendableBalances } from "./balances";
import { loadDeployment, getContractAddress } from "./deployments";

const setupZetachainOverrides = () => {
  // Override Artifacts
  const artifacts = listArtifacts();
  for (const artifactConfig of artifacts) {
    const artifact = getArtifact(artifactConfig.nullifiers, artifactConfig.commitments);
    const variant = `${artifactConfig.nullifiers}x${artifactConfig.commitments}`;
    overrideArtifact(variant, {
      ...artifact,
      dat: undefined
    });
  }
  console.log("Overridden artifacts with test artifacts");
}

export const generatePrivateTransfer = async (
  encryptionKey: string,
  senderWalletInfo: RailgunWalletInfo,
  receiverWalletInfo: RailgunWalletInfo,
  memoText: string | undefined, // optional memo text for the transfer
  sendWithPublicWallet: boolean = true
) => {
  console.log("TEST_PrivateTransfer");
  const { wallet } = getProviderWallet();
  setupZetachainOverrides();

  const TEST_AMOUNT = 8000000000000000n; // 0.008 ZETACHAIN ETH
  const ZRC20_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // ZETACHAIN ETH to test

  const transaction = await generateTransferTransaction(
      TEST_NETWORK,
      senderWalletInfo.id,
      receiverWalletInfo.railgunAddress,
      TEST_AMOUNT,
      ZRC20_ADDRESS,
      encryptionKey,
      wallet
  );
  console.log("ERC20 transaction: ", transaction);
  return transaction;
};


export const executePrivateTransfer = async (
  encryptionKey: string,
  senderWalletInfo: RailgunWalletInfo,
  memoText: string | undefined, // optional memo text for the transfer
  sendWithPublicWallet: boolean = true
) => {
  const sepoliaWallet = getSepoliaWallet();
  const EVM_ADAPT_ADDRESS = getContractAddress(SEPOLIA_DEPLOYMENT_NETWORK, "EVMAdapt");
  const evmAdaptContract = new Contract(
    EVM_ADAPT_ADDRESS,
    [
      "function transactOnZetachain(bytes calldata _transactData) external",
    ],
    sepoliaWallet.wallet
  );

  const mnemonic = process.env.MNEMONIC || "junk junk junk test test test test test test test test test";
  const receiverWalletInfo = await createRailgunWallet(
    TEST_ENCRYPTION_KEY,
    mnemonic,
    undefined, // creationBlockNumbers
  );
  const transaction = await generatePrivateTransfer(encryptionKey, senderWalletInfo, receiverWalletInfo, memoText, sendWithPublicWallet);
  const data = transaction.transaction.data

  const tx = await evmAdaptContract.transactOnZetachain(data);
  await tx.wait();
  console.log("Private Transfer TX: ", tx.hash);
  return tx.hash;
};

/**
 * Initializes the RAILGUN engine with the specified configuration.
 */
const initializeEngine = async (args?: {
  walletSource?: string;
  dbPath?: string;
  artifactsPath?: string;
  ppoiNodes?: string[];
}): Promise<void> => {
  const walletSource = args?.walletSource ?? "quickstart demo";
  const dbPath = args?.dbPath ?? "./engine.db";
  const db = createNodeDatabase(dbPath);
  const shouldDebug = true;
  const artifactPath = args?.artifactsPath ?? "artifacts-directory";
  const artifactStore = createNodeArtifactStore(artifactPath);
  const useNativeArtifacts = false;
  const skipMerkletreeScans = false;
  const poiNodeURLs: string[] = args?.ppoiNodes ?? [
    "https://ppoi-agg.horsewithsixlegs.xyz",
  ];
  const customPOILists: POIList[] = [];
  const verboseScanLogging = true;

  await sdkInitializeEngine({
    walletSource,
    db,
    artifactStore,
    shouldDebug,
    useNativeArtifacts,
    skipMerkletreeScans,
    poiNodeURLs,
    customPOILists,
    verboseScanLogging
  });

  process.on("SIGINT", async (sigint) => {
    console.log("EXIT DETECTED", sigint);
    await stopEngine();
    process.exit(0);
  });
};

/**
 * Main entry point for running private transfer independently
 */
const main = async () => {
  try {
    // Initialize RAILGUN Engine
    await initializeEngine();
    console.log("RAILGUN Engine initialized");

    // Configure RAILGUN contract addresses from deployment
    const zetachainDeployment = loadDeployment(ZETACHAIN_DEPLOYMENT_NETWORK);
    NETWORK_CONFIG[TEST_NETWORK].proxyContract = zetachainDeployment.contracts.RailgunProxy.address;
    NETWORK_CONFIG[TEST_NETWORK].relayAdaptContract = zetachainDeployment.contracts.RelayAdapt.address;

    console.log("RAILGUN contract addresses configured:");
    console.log("  - RailgunProxy:", NETWORK_CONFIG[TEST_NETWORK].proxyContract);
    console.log("  - RelayAdapt:", NETWORK_CONFIG[TEST_NETWORK].relayAdaptContract);

    // Load Network
    await sdkLoadEngineProvider({
      name: TEST_NETWORK,
      rpcUrl: TEST_RPC_URL,
      chainId: NETWORK_CONFIG[TEST_NETWORK].chain.id,
    });
    console.log("Network loaded");
    // await setupNodeGroth16();
    console.log("Groth16 setup");

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
    console.log("Wallet ID:", walletInfo.id);
    console.log("Railgun Address:", walletInfo.railgunAddress);

    const { provider, wallet } = getProviderWallet();
    console.log("Public Wallet Address:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log("Zeta Balance:", balance.toString());

    // Setup balance callbacks
    setupBalanceCallbacks();

    // Wait for balances to load
    console.log("Waiting for balances to load...");
    runBalancePoller([walletInfo.id]);
    await waitForBalancesLoaded();

    // Display spendable balances
    displaySpendableBalances();

    // Execute private transfer
    await executePrivateTransfer(TEST_ENCRYPTION_KEY, walletInfo, undefined, true);

    console.log("Private transfer completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Failed to execute private transfer:", err);
    process.exit(1);
  }
};

// Run main if this file is executed directly
if (require.main === module) {
  main();
}