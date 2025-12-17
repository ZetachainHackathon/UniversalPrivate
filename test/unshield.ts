import {
  calculateGasPrice,
  NETWORK_CONFIG,
  NetworkName,
  TXIDVersion,
  type RailgunERC20Amount,
  type RailgunERC20AmountRecipient,
  type RailgunERC20Recipient,
  type RailgunNFTAmount,
  type RailgunNFTAmountRecipient,
  type RailgunWalletInfo,
  type TransactionGasDetails,
} from "@railgun-community/shared-models";
import {
  createRailgunWallet,
  getEngine,
  gasEstimateForUnprovenCrossContractCalls,
  generateCrossContractCallsProof,
  populateProvedCrossContractCalls,
  TokenType,
  getEngine,
} from "@railgun-community/wallet";
import {
  initializeEngine as sdkInitializeEngine,
  stopEngine,
  loadEngineProvider as sdkLoadEngineProvider,
  getGasDetailsForTransaction,
  getOriginalGasDetailsForTransaction,
  serializeERC20RelayAdaptUnshield,
  serializeERC20Transfer,
} from "@repo/sdk";
import { createNodeDatabase, createNodeArtifactStore } from "@repo/sdk/node";
import { TEST_ENCRYPTION_KEY, TEST_NETWORK, ZETACHAIN_DEPLOYMENT_NETWORK, SEPOLIA_DEPLOYMENT_NETWORK } from "./constants";
import { getProviderWallet, getSepoliaWallet } from "./wallet";
import { Contract, ethers, type ContractTransaction } from "ethers";
import { TokenData } from "@railgun-community/engine";
import { overrideArtifact } from "@railgun-community/wallet";
import { getArtifact, listArtifacts } from "railgun-circuit-test-artifacts";
import { getContractAddress, loadDeployment } from "./deployments";


import type { POIList } from "@railgun-community/shared-models";

import { setupNodeGroth16 } from "./prover";
import { setupBalanceCallbacks, runBalancePoller, waitForBalancesLoaded, displaySpendableBalances } from "./balances";

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

export const crossContractGasEstimate = async (
  encryptionKey: string,
  network: NetworkName,
  railgunWalletID: string,
  erc20AmountUnshieldAmounts: RailgunERC20Amount[],
  erc721AmountUnshieldAmounts: RailgunNFTAmount[],
  erc20ShieldRecipients: RailgunERC20Recipient[],
  erc721AmountShieldRecipients: RailgunNFTAmountRecipient[],
  crossContractCalls: ContractTransaction[],
  minGasLimit: bigint, // provided by user, or cookbook output.
  sendWithPublicWallet: boolean = true,
  feeTokenDetails: RailgunERC20AmountRecipient | undefined = undefined
) => {
  const originalGasDetails = await getOriginalGasDetailsForTransaction(
    network,
    sendWithPublicWallet
  );
  console.log("CrossContract: originalGasDetails: ", originalGasDetails);
  const { gasEstimate } = await gasEstimateForUnprovenCrossContractCalls(
    TXIDVersion.V2_PoseidonMerkle,
    network,
    railgunWalletID,
    encryptionKey,
    erc20AmountUnshieldAmounts,
    erc721AmountUnshieldAmounts,
    erc20ShieldRecipients,
    erc721AmountShieldRecipients,
    crossContractCalls,
    originalGasDetails,
    feeTokenDetails,
    sendWithPublicWallet,
    minGasLimit
  );
  return gasEstimate;
};

export const crossContractGenerateProof = async (
  encryptionKey: string,
  network: NetworkName,
  railgunWalletID: string,
  erc20AmountUnshieldAmounts: RailgunERC20Amount[],
  erc721AmountUnshieldAmounts: RailgunNFTAmount[],
  erc20AmountShieldRecipients: RailgunERC20Recipient[],
  erc721AmountShieldRecipients: RailgunNFTAmountRecipient[],
  crossContractCalls: ContractTransaction[],
  overallBatchMinGasPrice: bigint,
  minGasLimit: bigint,
  sendWithPublicWallet: boolean = true,
  broadcasterFeeERC20AmountRecipient:
    | RailgunERC20AmountRecipient
    | undefined = undefined
) => {
  const progressCallback = (progress: number) => {
    // Handle proof progress (show in UI).
    // Proofs can take 20-30 seconds on slower devices.
    console.log("CrossContract Call Proof progress: ", progress);
  };
  // GENERATES RAILGUN SPENDING PROOF
  await generateCrossContractCallsProof(
    TXIDVersion.V2_PoseidonMerkle,
    network,
    railgunWalletID,
    encryptionKey,
    erc20AmountUnshieldAmounts,
    erc721AmountUnshieldAmounts,
    erc20AmountShieldRecipients,
    erc721AmountShieldRecipients,
    crossContractCalls,
    broadcasterFeeERC20AmountRecipient,
    sendWithPublicWallet,
    overallBatchMinGasPrice,
    minGasLimit,
    progressCallback
  );
};
export const crossContractCallsPopulateTransaction = async (
    network: NetworkName,
    railgunWalletID: string,
    erc20AmountUnshieldAmounts: RailgunERC20Amount[],
    erc721AmountUnshieldAmounts: RailgunNFTAmount[],
    erc20AmountShieldRecipients: RailgunERC20Recipient[],
    erc721AmountShieldRecipients: RailgunNFTAmountRecipient[],
    crossContractCalls: ContractTransaction[],
    transactionGasDetails: TransactionGasDetails,
    overallBatchMinGasPrice: bigint,
    sendWithPublicWallet: boolean = true,
  
    broadcasterFeeERC20AmountRecipient:
      | RailgunERC20AmountRecipient
      | undefined = undefined
  ) => {
    const populateResponse = await populateProvedCrossContractCalls(
      TXIDVersion.V2_PoseidonMerkle,
      network,
      railgunWalletID,
      erc20AmountUnshieldAmounts,
      erc721AmountUnshieldAmounts,
      erc20AmountShieldRecipients,
      erc721AmountShieldRecipients,
      crossContractCalls,
      broadcasterFeeERC20AmountRecipient,
      sendWithPublicWallet,
      overallBatchMinGasPrice,
      transactionGasDetails
    );
  
    return populateResponse;
  };

// 生成unshieldOutsideChain的data流程 
export const generateUnshieldOutsideChainData = async (
  encryptionKey: string,
  railgunWalletInfo: RailgunWalletInfo
) => {
  setupZetachainOverrides();
  const { wallet, provider } = getProviderWallet();
  
  // Ensure engine is synced to get latest Merkle Root
  const engine = getEngine();
  console.log("Syncing engine...");
  await engine.scanContractHistory(NETWORK_CONFIG[TEST_NETWORK].chain, undefined);
  console.log("Engine synced.");

  // get gas estimate,
  // generate proof,
  // populate tx

  // Load contract address from deployment file
  const ZETACHAIN_ADAPT_ADDRESS = getContractAddress(ZETACHAIN_DEPLOYMENT_NETWORK, "ZetachainAdapt");

  const TEST_AMOUNT = 9975000000000000n; // 0.001 ZETACHAIN ETH
  const ZRC20_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // ZETACHAIN ETH to test
  const TARGET_ZRC20_ADDRESS = "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD"; // 目標鏈的ZRC20地址(決定要轉到哪條鏈) BASE
  const RECEIVER = "0xc4660f40ba6fe89b3ba7ded44cf1db73d731c95e"; // Receiver address 20 bytes
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"; // Zero address

  console.log("Using ZetachainAdapt address:", ZETACHAIN_ADAPT_ADDRESS);

  //const GAS_LIMIT = 500000n; 
  const unshieldFeeBasisPoints = 25n;
  const amountAfterFee = TEST_AMOUNT * (10000n - unshieldFeeBasisPoints) / 10000n ;

  // unshield的交易(從Railgun取出) 
  const erc20AmountUnshieldAmounts: RailgunERC20Amount[] = [
    serializeERC20RelayAdaptUnshield(
      ZRC20_ADDRESS, // ZETACHAIN ETH
      TEST_AMOUNT
    ),
  ];

  

  /* 範例是解wrap ETH的交易，所以用不到
  const { wrappedAddress } = NETWORK_CONFIG[TEST_NETWORK].baseToken;
  const wethContract = new Contract(
    wrappedAddress,
    [
      "function deposit() payable",
      "function withdraw(uint256)",
      "function balanceOf(address) view returns (uint256)",
    ],
    provider
  );

  const unwrap = await wethContract.withdraw.populateTransaction(TEST_AMOUNT);
  const crossContractCalls: ContractTransaction[] = [
    {
      to: unwrap.to,
      data: unwrap.data, // unwrapeth
      value: 0n,
    },
  ];
  */
  
  // 轉移ZRC20到ZetachainAdapt contract
  const zrc20 = new Contract(
    ZRC20_ADDRESS,
    ["function transfer(address to, uint256 amount) returns (bool)"],
    provider
  );
  const transferData = await zrc20.transfer.populateTransaction(
    ZETACHAIN_ADAPT_ADDRESS,
    amountAfterFee
  );
  
  // 與ZetachainAdapt contract互動，觸發提款
  const zetachainAdaptContract = new Contract(
    ZETACHAIN_ADAPT_ADDRESS,
    [
      
      "function withdraw(bytes receiver, uint256 amount, address zrc20, address targetZrc20, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions) external",
    ],
    provider
  );
  
  const withdrawData = await zetachainAdaptContract.withdraw.populateTransaction(
    RECEIVER,
    amountAfterFee,
    ZRC20_ADDRESS,
    TARGET_ZRC20_ADDRESS,
    // revertMessage 應該是 bytes，傳空 bytes
    { revertAddress: ZERO_ADDRESS, callOnRevert: false, abortAddress: ZERO_ADDRESS, revertMessage: "0x", onRevertGasLimit: 0 }
  );
  console.log("CrossContractCall withdrawData.data: ", withdrawData.data);
  console.log("CrossContractCall withdrawData: ", withdrawData);
  /*
  const RAILGUN_RELAY_ADAPT_ADDRESS = "0x88Ca9A06278d8C63F69d3e3CB63aC6361EE647Ad"; // 假設這是正確的 Relay Adapt 地址
  const relayAdaptABI = [
      "function transfer(tuple(tuple(uint256 tokenType, address tokenAddress, uint256 tokenSubID) token, address to, uint256 value)[] _transfers) external",
  ];
  const relayAdaptContract : Contract = new Contract(
    RAILGUN_RELAY_ADAPT_ADDRESS,
    relayAdaptABI,
    provider
  );
  

  */
  
  

  const crossContractCalls: ContractTransaction[] = [
    {
        to: transferData.to,
        data: transferData.data,
        value: 0n,
    },
    {
        to: withdrawData.to,
        data: withdrawData.data,
        value: 0n,
    }
  ];
  
  console.log("CrossContractCall crossContractCalls: ", crossContractCalls);

  const minGasLimit = 1_000_000n; // Adjusted gas limit for ZetaChain execution
  // const overallBatchMinGasPrice = 1n;
  const gasEstimate = await crossContractGasEstimate(
    encryptionKey,
    TEST_NETWORK,
    railgunWalletInfo.id,
    erc20AmountUnshieldAmounts,
    [],
    [], 
    [],
    crossContractCalls,
    minGasLimit,
    true
  );

  console.log("Private CrossContract TX gasEstimate: ", gasEstimate);

  const transactionGasDetails = await getGasDetailsForTransaction(
    TEST_NETWORK,
    gasEstimate,
    true,
    wallet
  );
  const overallBatchMinGasPrice = calculateGasPrice(transactionGasDetails);

  // generate proof
  await crossContractGenerateProof(
    encryptionKey,
    TEST_NETWORK,
    railgunWalletInfo.id,
    erc20AmountUnshieldAmounts,
    [],
    [], 
    [],
    crossContractCalls,
    overallBatchMinGasPrice,
    minGasLimit,
    true
  );

  // populate tx
  const transaction = await crossContractCallsPopulateTransaction(
    TEST_NETWORK,
    railgunWalletInfo.id,
    erc20AmountUnshieldAmounts,
    [],
    [], 
    [],
    crossContractCalls,
    transactionGasDetails,
    overallBatchMinGasPrice,
    true
  );
  
  console.log("Transaction: ", transaction);
  

  return transaction.transaction.data
};

export const unshieldOutsideChain = async (
  encryptionKey: string,
  railgunWalletInfo: RailgunWalletInfo
) => {

  const sepoliaWallet = getSepoliaWallet();

  // Load contract address from deployment file
  const EVM_ADAPT_ADDRESS = getContractAddress(SEPOLIA_DEPLOYMENT_NETWORK, "EVMAdapt");

  console.log("Using EVMAdapt address:", EVM_ADAPT_ADDRESS);

  const evmAdaptContract = new Contract(
    EVM_ADAPT_ADDRESS,
    [
      "function unshieldOutsideChain(bytes calldata _unshieldOutsideChainData) external",
    ],
    sepoliaWallet.wallet
  );

  const unshieldOutsideChainData = await generateUnshieldOutsideChainData(
    encryptionKey,
    railgunWalletInfo
  );
  console.log("UnshieldOutsideChain data: ", unshieldOutsideChainData);

  //console.log(`Sending ${crossChainFee} wei as cross-chain fee`);
  const tx = await evmAdaptContract.unshieldOutsideChain(unshieldOutsideChainData);
  const receipt = await tx.wait();
  console.log("UnshieldOutsideChain transaction receipt: ", receipt);
  return tx;
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
 * Main entry point for running unshield independently
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

    // Execute unshield
    await unshieldOutsideChain(TEST_ENCRYPTION_KEY, walletInfo);

    console.log("Unshield completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Failed to execute unshield:", err);
    process.exit(1);
  }
};

// Run main if this file is executed directly
if (require.main === module) {
  main();
}

