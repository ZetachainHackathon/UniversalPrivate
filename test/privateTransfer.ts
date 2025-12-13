
import {
  calculateGasPrice,
  NetworkName,
  TXIDVersion,
  NETWORK_CONFIG,
  type FeeTokenDetails,
  type RailgunERC20AmountRecipient,
  type RailgunWalletInfo,
  type TransactionGasDetails,
  type POIList,
} from "@railgun-community/shared-models";
import {
  gasEstimateForUnprovenTransfer,
  generateTransferProof,
  populateProvedTransfer,
  createRailgunWallet,
  overrideArtifact,
  startRailgunEngine,
  stopRailgunEngine,
  getEngine,
} from "@railgun-community/wallet";
import {
  getGasDetailsForTransaction,
  getOriginalGasDetailsForTransaction,
  serializeERC20Transfer,
} from "./transcation/util";
import { TEST_ENCRYPTION_KEY, TEST_NETWORK, TEST_TOKEN, ZETACHAIN_DEPLOYMENT_NETWORK, SEPOLIA_DEPLOYMENT_NETWORK } from "./constants";
import { getProviderWallet, getSepoliaWallet } from "./wallet";
import { Contract } from "ethers";
import { getArtifact, listArtifacts } from "railgun-circuit-test-artifacts";
import { createNodeDatabase } from "./db";
import { createArtifactStore } from "./artifact";
import { loadEngineProvider } from "./loadProvider";
import { setupNodeGroth16 } from "./prover";
import { setupBalanceCallbacks, runBalancePoller, waitForBalancesLoaded, displaySpendableBalances } from "./balances";
import { loadDeployment, getContractAddress } from "./deployments";
/*
import {
  getBroadcasterDetails,
  getFeeTokenDetails,
} from "./waku/waku";
 */
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

export const erc20PrivateTransferGasEstimate = async (
  encryptionKey: string,
  network: NetworkName,
  railgunWalletID: string,
  erc20AmountRecipient: RailgunERC20AmountRecipient[],
  sendWithPublicWallet: boolean = true,
  feeTokenDetails: FeeTokenDetails | undefined = undefined,
  memoText: string | undefined = undefined
) => {
  const originalGasDetails = await getOriginalGasDetailsForTransaction(
    network,
    sendWithPublicWallet
  );
  console.log("originalGasDetails: ", originalGasDetails);
  const { gasEstimate } = await gasEstimateForUnprovenTransfer(
    TXIDVersion.V2_PoseidonMerkle,
    network,
    railgunWalletID,
    encryptionKey,
    memoText,
    erc20AmountRecipient,
    [], // nftAmountRecipients
    originalGasDetails,
    feeTokenDetails,
    sendWithPublicWallet
  );

  const estimatedGasDetails = { ...originalGasDetails, gasEstimate };

  return {
    gasEstimate,
    estimatedGasDetails,
    originalGasDetails,
  };
};


export const erc20PrivateTransferGenerateProof = async (
  encryptionKey: string,
  network: NetworkName,
  railgunWalletID: string,
  tokenAmountRecipients: RailgunERC20AmountRecipient[],
  overallBatchMinGasPrice: bigint,
  showSenderAddressToRecipient: boolean = true,
  sendWithPublicWallet: boolean = true,
  broadcasterFeeERC20AmountRecipient:
    | RailgunERC20AmountRecipient
    | undefined = undefined,
  memoText: string | undefined = undefined
) => {
  const progressCallback = (progress: number) => {
    // Handle proof progress (show in UI).
    // Proofs can take 20-30 seconds on slower devices.
    console.log("Private ERC20 Transfer Proof progress: ", progress);
  };
  // GENERATES RAILGUN SPENDING PROOF
  await generateTransferProof(
    TXIDVersion.V2_PoseidonMerkle,
    network,
    railgunWalletID,
    encryptionKey,
    showSenderAddressToRecipient,
    memoText,
    tokenAmountRecipients,
    [], // nftAmountRecipients
    broadcasterFeeERC20AmountRecipient,
    sendWithPublicWallet,
    overallBatchMinGasPrice,
    progressCallback
  );
};

export const erc20PrivateTransferPopulateTransaction = async (
  network: NetworkName,
  railgunWalletID: string,
  tokenAmountRecipients: RailgunERC20AmountRecipient[],
  overallBatchMinGasPrice: bigint,
  transactionGasDetails: TransactionGasDetails,
  sendWithPublicWallet: boolean = true,
  broadcasterFeeERC20AmountRecipient:
    | RailgunERC20AmountRecipient
    | undefined = undefined,
  showSenderAddressToRecipient: boolean = true,
  memoText: string | undefined = undefined
) => {
  const populateResponse = await populateProvedTransfer(
    TXIDVersion.V2_PoseidonMerkle,
    network,
    railgunWalletID,
    showSenderAddressToRecipient,
    memoText,
    tokenAmountRecipients,
    [], // nftAmountRecipients
    broadcasterFeeERC20AmountRecipient,
    sendWithPublicWallet,
    overallBatchMinGasPrice,
    transactionGasDetails
  );

  return populateResponse;
};


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
  // get gas estimate,
  // generate proof,
  // populate tx

  const TEST_AMOUNT = 8000000000000000n; // 0.008 ZETACHAIN ETH
  const ZRC20_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // ZETACHAIN ETH to test
  const RECEIVER = "0xc4660f40ba6fe89b3ba7ded44cf1db73d731c95e"; // Receiver address 20 bytes

  const erc20AmountRecipients: RailgunERC20AmountRecipient[] = [
    serializeERC20Transfer(
      ZRC20_ADDRESS, // WETH
      TEST_AMOUNT,
      receiverWalletInfo.railgunAddress
    ),
  ];

  /* dependent if !sendWithPublicWallet
  const { broadcaster, feeTokenDetails } = await getFeeTokenDetails(
    TEST_NETWORK,
    TEST_TOKEN,
    sendWithPublicWallet
  );
  */

  const { gasEstimate, originalGasDetails, estimatedGasDetails } =
    await erc20PrivateTransferGasEstimate(
      encryptionKey,
      TEST_NETWORK,
      senderWalletInfo.id,
      erc20AmountRecipients,
      sendWithPublicWallet,
      undefined, // feeTokenDetails
      memoText // optional memo text for the transfer
    );

  const transactionGasDetails = await getGasDetailsForTransaction(
    TEST_NETWORK,
    gasEstimate,
    sendWithPublicWallet, // true if using public wallet
    wallet
  );

  /* only do this if !sendWithPublicWallet
  const broadcasterDetails = await getBroadcasterDetails(
    estimatedGasDetails,
    broadcaster,
    feeTokenDetails
  );
  */

  console.log("Private ERC20 TX gasEstimate: ", gasEstimate);
  const overallBatchMinGasPrice = calculateGasPrice(transactionGasDetails);

  // generate proof
  await erc20PrivateTransferGenerateProof(
    encryptionKey,
    TEST_NETWORK,
    senderWalletInfo.id,
    erc20AmountRecipients,
    overallBatchMinGasPrice /* overallBatchMinGasPrice */,
    true /* showSenderAddressToRecipient */,
    sendWithPublicWallet /*true if using public wallet*/,
    undefined, /* broadcasterDetails?.broadcasterFeeERC20AmountRecipient :pass the broadcaster fee recipient */
    memoText /* memoText */
  );

  // populate tx
  const transaction = await erc20PrivateTransferPopulateTransaction(
    TEST_NETWORK,
    senderWalletInfo.id,
    erc20AmountRecipients,
    overallBatchMinGasPrice,
    transactionGasDetails,
    sendWithPublicWallet,
    undefined, /* broadcasterDetails?.broadcasterFeeERC20AmountRecipient  pass the broadcaster fee recipient */
    true /* showSenderAddressToRecipient */,
    memoText /* memoText (optional) */
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
  const artifactStore = createArtifactStore(artifactPath);
  const useNativeArtifacts = false;
  const skipMerkletreeScans = false;
  const poiNodeURLs: string[] = args?.ppoiNodes ?? [
    "https://ppoi-agg.horsewithsixlegs.xyz",
  ];
  const customPOILists: POIList[] = [];
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
    await loadEngineProvider();
    console.log("Network loaded");
    await setupNodeGroth16();
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