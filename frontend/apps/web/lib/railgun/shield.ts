import {
  NetworkName,
  RailgunERC20AmountRecipient,
} from "@railgun-community/shared-models";
import {
  Contract,
  type HDNodeWallet, 
  type Wallet, 
  type JsonRpcSigner,
  formatUnits,
  ZeroAddress
} from "ethers";

// Import from SDK
import { 
    erc20PopulateShieldTransaction as sdkErc20PopulateShieldTransaction,
    erc20ShieldGasEstimate as sdkErc20ShieldGasEstimate,
    serializeERC20Transfer
} from "@st99005912/universal-private-sdk";

import { TEST_NETWORK, TEST_TOKEN } from "@/constants";
import { getProviderWallet } from "@/lib/utils";
import { CONFIG } from "@/config/env";

// Re-export or wrap SDK function
export const erc20ShieldGasEstimate = sdkErc20ShieldGasEstimate;

/**
 * 準備 Shield 交易 (包含 Approve 檢查)
 * 1. 檢查並執行 ERC20 Approve (如果額度不足)
 * 2. 估算 Gas
 * 3. 產生 Shield 交易資料
 */
export const erc20PopulateShieldTransaction = async (
  network: NetworkName,
  wallet: Wallet | HDNodeWallet | JsonRpcSigner,
  erc20AmountRecipients: RailgunERC20AmountRecipient[],
  sendWithPublicWallet: boolean,
  onProgress?: (message: string) => void
) => {
  const walletAddress = await wallet.getAddress();

  // 1. 檢查並執行 Approve（處理 Native Token 包裝）
  for (const amountRecipient of erc20AmountRecipients) {
    const isNativeToken = amountRecipient.tokenAddress === ZeroAddress;
    
    // 如果是 Native Token，需要先包裝成 WZETA
    if (isNativeToken) {
      onProgress?.("🔄 檢測到 Native Token (ZETA)，準備包裝為 WZETA...");
      console.log("🔄 檢測到 Native Token，需要先包裝成 WZETA...");
      
      // 獲取 WZETA 地址
      const wzetaAddress = CONFIG.TOKENS.WZETA?.address;
      if (!wzetaAddress) {
        throw new Error("WZETA 地址未配置，無法包裝 Native Token");
      }
      
      // 檢查 Native Token 餘額
      if (!wallet.provider) {
        throw new Error("Provider 不可用，無法獲取 Native Token 餘額");
      }
      const nativeBalance = await wallet.provider.getBalance(walletAddress);
      
      if (nativeBalance < amountRecipient.amount) {
        throw new Error(`Native Token 餘額不足：需要 ${formatUnits(amountRecipient.amount, 18)}，但只有 ${formatUnits(nativeBalance, 18)}`);
      }
      
      // 包裝 Native Token 為 WZETA
      const wzetaContract = new Contract(
        wzetaAddress,
        ["function deposit() payable returns ()"],
        wallet
      ) as any;
      
      onProgress?.(`📦 正在包裝 ${formatUnits(amountRecipient.amount, 18)} ZETA 為 WZETA...`);
      console.log(`📦 正在包裝 ${formatUnits(amountRecipient.amount, 18)} Native Token 為 WZETA...`);
      const wrapTx = await wzetaContract.deposit({ value: amountRecipient.amount });
      
      onProgress?.("⏳ 等待包裝交易確認...");
      await wrapTx.wait();
      
      onProgress?.("✅ 包裝完成！準備進行 Shield...");
      console.log("✅ 包裝成功！");
      
      // 更新 tokenAddress 為 WZETA
      amountRecipient.tokenAddress = wzetaAddress;
    }
  }

  // 2. 呼叫 SDK 進行 Approve (如果需要) 和 Populate Shield
  onProgress?.("⏳ 正在檢查授權並準備交易...");
  console.log("⏳ 呼叫 SDK 進行 Shield 準備...");
  
  const result = await sdkErc20PopulateShieldTransaction(
      network,
      wallet,
      erc20AmountRecipients,
      sendWithPublicWallet
  );
  
  onProgress?.("✅ 交易準備完成！");
  return result;
};

/**
 * 執行 Local Shield (供前端使用)
 */
export const executeLocalShield = async (
    railgunAddress: string,
    tokenAddress: string,
    amount: bigint,
    signer: JsonRpcSigner | Wallet,
    network: NetworkName = TEST_NETWORK,
    onProgress?: (message: string) => void
) => {
    console.log("🚀 準備執行 Local Shield...");
    const walletAddress = await signer.getAddress();
    console.log("發送者 (Public):", walletAddress);
    console.log("接收者 (Private):", railgunAddress);

    const erc20AmountRecipients = [
        serializeERC20Transfer(
            tokenAddress,
            amount,
            railgunAddress
        ),
    ];

    // 準備交易 (這一步如果需要 Approve 會等待)
    const { transaction } = await erc20PopulateShieldTransaction(
        network,
        signer,
        erc20AmountRecipients,
        true, // sendWithPublicWallet
        onProgress
    );

    // 發送 Shield 交易
    onProgress?.("📤 發送 Shield 交易中...");
    console.log("📤 發送 Shield 交易中...");
    const tx = await signer.sendTransaction(transaction);
    console.log("Transaction Hash:", tx.hash);

    return tx;
};


/**
 * 執行 Shield 動作的主函式 (供 UI 呼叫)
 * @param railgunWalletAddress 你的 0zk 隱私地址
 * @param tokenAddress 要 Shield 的代幣地址 (預設為 TEST_TOKEN)
 * @param amount 要 Shield 的數量 (預設 1n)
 */
export const executeShieldERC20 = async (
  railgunWalletAddress: string,
  tokenAddress: string = TEST_TOKEN,
  amount: bigint = 1n // 注意單位: 1n = 1 wei
) => {
  // 取得測試用的 Ethers Wallet (這裡用的是有私鑰的測試錢包)
  const { wallet } = getProviderWallet();

  console.log("🚀 準備執行 Shield...");
  console.log("發送者 (Public):", wallet.address);
  console.log("接收者 (Private):", railgunWalletAddress);

  const erc20AmountRecipients = [
    serializeERC20Transfer(
      tokenAddress,
      amount,
      railgunWalletAddress
    ),
  ];

  // 準備交易 (這一步如果需要 Approve 會等待)
  const { transaction } = await erc20PopulateShieldTransaction(
    TEST_NETWORK,
    wallet,
    erc20AmountRecipients,
    true // sendWithPublicWallet
  );

  // 發送 Shield 交易
  console.log("📤 發送 Shield 交易中...");
  const tx = await wallet.sendTransaction(transaction);
  console.log("Transaction Hash:", tx.hash);
  
  await tx.wait();
  console.log("✅ Shield 交易確認成功！請等待餘額掃描更新。");
  
  return tx.hash;
};
