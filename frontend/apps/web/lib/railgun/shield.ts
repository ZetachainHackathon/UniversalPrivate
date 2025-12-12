// apps/web/lib/railgun/shield.ts

import {
  NETWORK_CONFIG,
  NetworkName,
  TXIDVersion,
  RailgunERC20AmountRecipient,
} from "@railgun-community/shared-models";
import {
  gasEstimateForShield,
  populateShield,
} from "@railgun-community/wallet";
import { 
  Contract, 
  BaseContract, 
  ContractTransactionResponse,
  type HDNodeWallet, 
  type Wallet, 
  type JsonRpcSigner,
  formatUnits
} from "ethers";

// 👇 引入我們之前寫好的模組
import { 
  getGasDetailsForTransaction, 
  getShieldSignature, 
  serializeERC20Transfer 
} from "./transaction-utils";
import { TEST_NETWORK, TEST_TOKEN } from "@/constants";
import { getProviderWallet } from "@/lib/utils";

/**
 * 估算 Shield 交易所需的 Gas
 */
export const erc20ShieldGasEstimate = async (
  network: NetworkName,
  wallet: Wallet | HDNodeWallet | JsonRpcSigner,
  erc20AmountRecipients: RailgunERC20AmountRecipient[]
) => {
  // @ts-expect-error JsonRpcSigner is compatible for signMessage
  const shieldPrivateKey = await getShieldSignature(wallet);
  const fromWalletAddress = await wallet.getAddress();

  const { gasEstimate } = await gasEstimateForShield(
    TXIDVersion.V2_PoseidonMerkle,
    network,
    shieldPrivateKey,
    erc20AmountRecipients,
    [], // nftAmountRecipients
    fromWalletAddress
  );

  return gasEstimate;
};

interface IERC20 extends BaseContract {
  allowance(owner: string, spender: string): Promise<bigint>;
  approve(spender: string, amount: bigint): Promise<ContractTransactionResponse>;
}

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
  sendWithPublicWallet: boolean
) => {
  const spender = NETWORK_CONFIG[network].proxyContract;
  const walletAddress = await wallet.getAddress();

  // 1. 檢查並執行 Approve
  for (const amountRecipient of erc20AmountRecipients) {
    
    // 👇 3. 關鍵修正：建立 Contract 後，強制轉型為 IERC20
    const contract = new Contract(
      amountRecipient.tokenAddress,
      [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) view returns (uint256)", // 👈 新增這個 ABI
        "function deposit() payable", // 👈 WZETA 通常有 deposit 功能
      ],
      wallet
    ) as unknown as IERC20 & { 
        balanceOf: (acc: string) => Promise<bigint>; 
        deposit: () => Promise<ContractTransactionResponse> 
    };

    const balance = await contract.balanceOf(walletAddress);
    console.log(`💰 當前餘額: ${formatUnits(balance, 18)}`);
    console.log(`📉 欲 Shield 數量: ${formatUnits(amountRecipient.amount, 18)}`)

    // 現在 contract.allowance 被視為必定存在的函數
    const allowance = await contract.allowance(walletAddress, spender);
    
    if (allowance < amountRecipient.amount) {
      console.log(`⏳ 正在授權 (Approve) 代幣: ${amountRecipient.tokenAddress}...`);
      const tx = await contract.approve(spender, amountRecipient.amount);
      await tx.wait(); 
      console.log("✅ 授權成功！");
    } else {
      console.log("ℹ️ 授權額度已足夠，跳過 Approve。");
    }
  }

  // 2. 估算 Shield Gas
  const gasEstimate = await erc20ShieldGasEstimate(
    network,
    wallet,
    erc20AmountRecipients
  );

  // @ts-expect-error JsonRpcSigner is compatible
  const shieldPrivateKey = await getShieldSignature(wallet);

  const gasDetails = await getGasDetailsForTransaction(
    network,
    gasEstimate,
    sendWithPublicWallet,
    // @ts-expect-error JsonRpcSigner is compatible
    wallet
  );

  // 3. 產生 Shield 交易物件
  const { transaction, nullifiers } = await populateShield(
    TXIDVersion.V2_PoseidonMerkle,
    network,
    shieldPrivateKey,
    erc20AmountRecipients,
    [],
    gasDetails
  );

  return {
    gasEstimate,
    gasDetails,
    transaction,
    nullifiers,
  };
};

/**
 * 執行 Local Shield (供前端使用)
 */
export const executeLocalShield = async (
    railgunAddress: string,
    tokenAddress: string,
    amount: bigint,
    signer: JsonRpcSigner | Wallet,
    network: NetworkName = TEST_NETWORK
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
        true // sendWithPublicWallet
    );

    // 發送 Shield 交易
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