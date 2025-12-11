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
} from "@railgun-community/wallet";
import {
  getGasDetailsForTransaction,
  getOriginalGasDetailsForTransaction,
  serializeERC20RelayAdaptUnshield,
  serializeERC20Transfer,
} from "./transcation/util";
import { TEST_ENCRYPTION_KEY, TEST_NETWORK } from "./constants";
import { getProviderWallet, getSepoliaWallet } from "./wallet";
import { Contract, type ContractTransaction } from "ethers";
import { TokenData } from "@railgun-community/engine";
import { overrideArtifact } from "@railgun-community/wallet";
import { getArtifact, listArtifacts } from "railgun-circuit-test-artifacts";

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

  const TEST_AMOUNT = 9975000000000000n; // 0.001 ZETACHAIN ETH
  const ZRC20_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // ZETACHAIN ETH to test
  const TARGET_ZRC20_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // 目標鏈的ZRC20地址(決定要轉到哪條鏈) BASE
  const ZETACHAIN_ADAPT_ADDRESS = "0xa69D6437F95C116eF70BCaf3696b186DFF6aCD49"; // ZetachainAdapt address
  const RECEIVER = "0xc54358218ee96a250bc3f89e5592198003609bd6"; // Receiver address
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"; // Zero address
  // 降低 gas limit 以減少 gas fee
  const GAS_LIMIT = 500000n; 
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
      
      "function withdraw(bytes receiver, uint256 amount, address zrc20, address targetZrc20, uint256 gasLimit, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions) external",
    ],
    provider
  );
  
  const withdrawData = await zetachainAdaptContract.withdraw.populateTransaction(
    RECEIVER,
    amountAfterFee,
    ZRC20_ADDRESS,
    TARGET_ZRC20_ADDRESS,
    GAS_LIMIT,
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
  const EVM_ADAPT_ADDRESS = "0xF6bf8ffd0460f922B98EE2fE8d101Da1781E1E59"; // Sepolia EVMAdapt address
  const evmAdaptContract = new Contract(
    EVM_ADAPT_ADDRESS,
    [
      "function unshieldOutsideChain(bytes calldata _unshieldOutsideChainData) external payable",
    ],
    sepoliaWallet.wallet
  );

  const unshieldOutsideChainData = await generateUnshieldOutsideChainData(
    encryptionKey,
    railgunWalletInfo
  );
  console.log("UnshieldOutsideChain data: ", unshieldOutsideChainData);

  //console.log(`Sending ${crossChainFee} wei as cross-chain fee`);
  const tx = await evmAdaptContract.unshieldOutsideChain(unshieldOutsideChainData, { value: 100000000000000n }); 
  const receipt = await tx.wait();
  console.log("UnshieldOutsideChain transaction receipt: ", receipt);
  return tx;
};


