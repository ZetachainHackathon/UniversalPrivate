// apps/web/lib/railgun/transaction-utils.ts

import {
  RailgunERC20AmountRecipient,
  RailgunERC20Amount,
  RailgunNFTAmount,
  RailgunNFTAmountRecipient,
  TransactionGasDetails,
  EVMGasType,
  getEVMGasTypeForTransaction,
  NetworkName,
} from "@railgun-community/shared-models";

import {
  getShieldPrivateKeySignatureMessage,
  NFTTokenType,
  assertValidRailgunAddress,
  ByteUtils,
} from "@railgun-community/wallet";

import { RailgunEngine, ShieldNoteERC20,ShieldRequestStruct  } from "@railgun-community/engine";

import { keccak256, type HDNodeWallet, type Wallet, type JsonRpcSigner } from "ethers";
import { TEST_NETWORK } from "@/constants";

export const generateERC20ShieldRequests = async (
  erc20AmountRecipient: RailgunERC20AmountRecipient,
  random: string,
  shieldPrivateKey: string,
): Promise<ShieldRequestStruct> => {

  const railgunAddress = erc20AmountRecipient.recipientAddress;

  assertValidRailgunAddress(railgunAddress);

  const { masterPublicKey, viewingPublicKey } =
    RailgunEngine.decodeAddress(railgunAddress);

  const shield = new ShieldNoteERC20(
    masterPublicKey,
    random,
    erc20AmountRecipient.amount,
    erc20AmountRecipient.tokenAddress,
  );
  return shield.serialize(
    ByteUtils.hexToBytes(shieldPrivateKey),
    viewingPublicKey,
  );
};

export const getShieldSignature = async (
  wallet: Wallet | HDNodeWallet
): Promise<string> => {
  const shieldSignatureMessage = getShieldPrivateKeySignatureMessage();
  const shieldPrivateKey = keccak256(
    await wallet.signMessage(shieldSignatureMessage)
  );
  return shieldPrivateKey;
};

export const serializeERC20RelayAdaptUnshield = (
  tokenAddress: string,
  amount: bigint
): RailgunERC20Amount => {
  return {
    tokenAddress,
    amount,
  };
};

export const serializeERC721RelayAdaptUnshield = (
  tokenAddress: string,
  tokenSubID: string
): RailgunNFTAmount => {
  return {
    nftAddress: tokenAddress,
    amount: 1n,
    tokenSubID,
    nftTokenType: NFTTokenType.ERC721,
  };
};

export const serializeERC20Transfer = (
  tokenAddress: string,
  amount: bigint,
  recipient: string
): RailgunERC20AmountRecipient => {
  return {
    tokenAddress,
    amount,
    recipientAddress: recipient,
  };
};

export const serializeERC721Transfer = (
  nftAddress: string,
  tokenSubID: string,
  recipient: string
): RailgunNFTAmountRecipient => {
  return {
    nftAddress,
    amount: 1n,
    tokenSubID,
    nftTokenType: NFTTokenType.ERC721,
    recipientAddress: recipient,
  };
};

export const getOriginalGasDetailsForTransaction = async (
  network: NetworkName,
  sendWithPublicWallet: boolean,
  signer: Wallet | HDNodeWallet | JsonRpcSigner
): Promise<TransactionGasDetails> => {
  const gasDetails = await getGasDetailsForTransaction(
    network,
    0n,
    sendWithPublicWallet,
    signer
  );
  return gasDetails;
};

export const getGasDetailsForTransaction = async (
  network: NetworkName,
  gasEstimate: bigint,
  sendWithPublicWallet: boolean,
  wallet: Wallet | HDNodeWallet | JsonRpcSigner
): Promise<TransactionGasDetails> => {
  const evmGasType: EVMGasType = getEVMGasTypeForTransaction(
    network,
    sendWithPublicWallet
  );

  let maxFeePerGas = 0n;
  let maxPriorityFeePerGas = 0n;
  let gasPrice = 0n;

  try {
    const feeData = await wallet.provider?.getFeeData();
    if (feeData) {
      maxFeePerGas = feeData.maxFeePerGas ?? 0n;
      maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0n;
      gasPrice = feeData.gasPrice ?? 0n;
    }
  } catch (e) {
    console.warn("無法獲取 Gas Fee Data, 使用預設值");
  }

  let gasDetails: TransactionGasDetails;

  switch (evmGasType) {
    case EVMGasType.Type0:
    case EVMGasType.Type1:
      gasDetails = {
        evmGasType,
        gasEstimate,
        gasPrice,
      };
      break;
    case EVMGasType.Type2:
      gasDetails = {
        evmGasType,
        gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
      };
      break;
  }
  return gasDetails;
};

