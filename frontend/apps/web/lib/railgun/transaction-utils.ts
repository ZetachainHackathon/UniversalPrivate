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
} from "@railgun-community/wallet";

// 👇👇👇 1. 暴力解決 Note 引入問題 👇👇👇
// 我們把整個 Engine 引入，並強制轉型為 any，繞過 TypeScript 檢查
import * as RailgunEngine from "@railgun-community/engine";
const { Note, ByteUtils } = RailgunEngine as any;

// 如果上面那招在執行時 (Runtime) 報錯 (Note is undefined)，
// 代表 Note 真的被藏在深處，請嘗試解開下面這行的註解 (Deep Import + Require):
// const Note = require("@railgun-community/engine/dist/note/note").Note;

// 👆👆👆 修正結束 👆👆👆

import { bech32 } from "bech32";
import { keccak256, getBytes, type HDNodeWallet, type Wallet } from "ethers";
import { TEST_NETWORK } from "@/constants";
import { getProviderWallet } from "@/lib/utils";

// ==========================================
// 🛠️ 手動實作 decodeAddress (Polyfill)
// 避免依賴 wallet 的內部路徑
// ==========================================
const decodeRailgunAddress = (address: string) => {
  try {
    if (!address.startsWith("0zk")) return undefined;
    const { words } = bech32.decode(address);
    const bytes = new Uint8Array(bech32.fromWords(words));

    if (bytes.length !== 64) return undefined;

    const masterPublicKey = bytes.subarray(0, 32);
    const viewingPublicKey = bytes.subarray(32, 64);

    return { masterPublicKey, viewingPublicKey };
  } catch (err) {
    console.error("Address decoding failed", err);
    return undefined;
  }
};

// 手動定義 TokenType
const EngineTokenType = {
  ERC20: 0,
  ERC721: 1,
  ERC1155: 2,
};

export interface ShieldRequestStruct {
  preimage: {
    npk: Uint8Array;
    token: {
      tokenType: number;
      tokenAddress: string;
      tokenSubID: bigint;
    };
    value: bigint;
  };
  ciphertext: {
    encryptedBundle: [string, string, string];
    shieldKey: string;
  };
}

// ==========================================
// 👇 跨鏈 Shield 專用工具
// ==========================================

export const generateERC20ShieldRequests = async (
  erc20AmountRecipient: RailgunERC20AmountRecipient,
  random: string,
  shieldSignature: string
): Promise<ShieldRequestStruct> => {
  
  // 1. 解碼
  const decodedAddress = decodeRailgunAddress(erc20AmountRecipient.recipientAddress);
  
  if (!decodedAddress) {
    throw new Error("Invalid Railgun Address (decode failed)");
  }

  // 2. 建立 Note
  // 這裡的 Note 來自上面的 any 轉型，TS 不會檢查它
  const note = Note.create(
    decodedAddress.masterPublicKey,
    random,
    erc20AmountRecipient.amount,
    {
      tokenAddress: erc20AmountRecipient.tokenAddress,
      tokenType: EngineTokenType.ERC20, 
      tokenSubID: 0n,
    }
  );

  // 3. 加密
  const { encryptedBundle, shieldKey } = note.encrypt(
    decodedAddress.viewingPublicKey,
    shieldSignature
  );

  // 4. 組裝
  const shieldRequest: ShieldRequestStruct = {
    preimage: {
      npk: getBytes(note.notePublicKey), 
      token: {
        tokenType: EngineTokenType.ERC20,
        tokenAddress: erc20AmountRecipient.tokenAddress,
        tokenSubID: 0n,
      },
      value: BigInt(note.value.toString()),
    },
    ciphertext: {
      encryptedBundle: encryptedBundle as [string, string, string],
      shieldKey: shieldKey,
    },
  };

  return shieldRequest;
};

// ==========================================
// 👇 以下保持原樣
// ==========================================

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
  sendWithPublicWallet: boolean
): Promise<TransactionGasDetails> => {
  const { wallet } = getProviderWallet();
  const gasDetails = await getGasDetailsForTransaction(
    network,
    0n,
    sendWithPublicWallet,
    wallet
  );
  return gasDetails;
};

export const getGasDetailsForTransaction = async (
  network: NetworkName,
  gasEstimate: bigint,
  sendWithPublicWallet: boolean,
  wallet: Wallet | HDNodeWallet
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

export const TEST_gasDetails = async () => {
  try {
    const { wallet } = getProviderWallet();
    const gasDetails = await getGasDetailsForTransaction(
      TEST_NETWORK,
      21000n,
      true,
      wallet
    );
    console.log("🔥 Gas Details 測試結果:", gasDetails);
  } catch (e) {
    console.error("Gas Details 測試失敗:", e);
  }
};