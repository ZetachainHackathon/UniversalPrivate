
import {
  calculateGasPrice,
  NetworkName,
  TXIDVersion,
  type FeeTokenDetails,
  type RailgunERC20AmountRecipient,
  type RailgunWalletInfo,
  type TransactionGasDetails,
} from "@railgun-community/shared-models";
import {
  gasEstimateForUnprovenTransfer,
  generateTransferProof,
  populateProvedTransfer,
} from "@railgun-community/wallet";
import {
  getGasDetailsForTransaction,
  getOriginalGasDetailsForTransaction,
  serializeERC20Transfer,
} from "./transcation/util";
import { TEST_NETWORK, TEST_TOKEN } from "./constants";
import { getProviderWallet, getSepoliaWallet } from "./wallet";
import { Contract } from "ethers";
/*
import {
  getBroadcasterDetails,
  getFeeTokenDetails,
} from "./waku/waku";
 */

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
  railgunWalletInfo: RailgunWalletInfo,
  memoText: string | undefined, // optional memo text for the transfer
  sendWithPublicWallet: boolean = true
) => {
  console.log("TEST_PrivateTransfer");
  const { wallet } = getProviderWallet();
  // get gas estimate,
  // generate proof,
  // populate tx

  const TEST_AMOUNT = 9975000000000000n; // 0.001 ZETACHAIN ETH
  const ZRC20_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // ZETACHAIN ETH to test
  const RECEIVER = "0xc4660f40ba6fe89b3ba7ded44cf1db73d731c95e"; // Receiver address 20 bytes

  const erc20AmountRecipients: RailgunERC20AmountRecipient[] = [
    serializeERC20Transfer(
      ZRC20_ADDRESS, // WETH
      TEST_AMOUNT,
      railgunWalletInfo.railgunAddress
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
      railgunWalletInfo.id,
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
    railgunWalletInfo.id,
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
    railgunWalletInfo.id,
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
  railgunWalletInfo: RailgunWalletInfo,
  memoText: string | undefined, // optional memo text for the transfer
  sendWithPublicWallet: boolean = true
) => {
  const sepoliaWallet = getSepoliaWallet();
  const EVM_ADAPT_ADDRESS = "0xc32AfcB92B92886ca08d288280127d5F1A535AaF"; // Sepolia EVMAdapt address
  const evmAdaptContract = new Contract(
    EVM_ADAPT_ADDRESS,
    [
      "function unshieldOutsideChain(bytes calldata _unshieldOutsideChainData) external payable",
    ],
    sepoliaWallet.wallet
  );
  const transaction = await generatePrivateTransfer(encryptionKey, railgunWalletInfo, memoText, sendWithPublicWallet);
  const { wallet } = getProviderWallet();
  const data = transaction.transaction.data

  const tx = await evmAdaptContract.unshieldOutsideChain(data, { value: 100000000000000n });
  await tx.wait();
  console.log("Private Transfer TX: ", tx.hash);
  return tx.hash;
};