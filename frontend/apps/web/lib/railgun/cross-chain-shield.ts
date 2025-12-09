// apps/web/lib/railgun/cross-chain-shield.ts

import { Contract, type Wallet, type HDNodeWallet, type JsonRpcSigner, ContractTransactionResponse } from "ethers";
import { RailgunERC20AmountRecipient } from "@railgun-community/shared-models";
import { ByteUtils } from "@railgun-community/engine"; // 這裡如果報錯，可以用 randomHex 替代方案

// 👇 引入我們之前修好的 transaction-utils
import {
  getShieldSignature,
  generateERC20ShieldRequests,
  serializeERC20Transfer,
  ShieldRequestStruct
} from "./transaction-utils";
import { getProviderWallet } from "@/lib/utils"; // 用於產生 Note 加密金鑰

// EVMAdapt 合約 ABI
const EVM_ADAPT_ABI = [
  {
    name: "shieldOnZetachain",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "_shieldRequests",
        type: "tuple[]",
        components: [
          {
            name: "preimage",
            type: "tuple",
            components: [
              { name: "npk", type: "bytes32" },
              {
                name: "token",
                type: "tuple",
                components: [
                  { name: "tokenType", type: "uint8" },
                  { name: "tokenAddress", type: "address" },
                  { name: "tokenSubID", type: "uint256" },
                ],
              },
              { name: "value", type: "uint120" },
            ],
          },
          {
            name: "ciphertext",
            type: "tuple",
            components: [
              { name: "encryptedBundle", type: "bytes32[3]" },
              { name: "shieldKey", type: "bytes32" },
            ],
          },
        ],
      },
    ],
    outputs: [],
  },
];

// ERC20 標準 ABI (用於 Approve)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

/**
 * 執行跨鏈 Shield (包含 Approve 和 Shield)
 * * @param railgunAddress 接收者的 0zk 地址 (在 ZetaChain 上)
 * @param evmAdaptAddress 跨鏈合約地址 (在 Sepolia 上)
 * @param tokenAddress 代幣地址 (在 Sepolia 上)
 * @param amount 數量
 * @param signer 連接到 Sepolia 的錢包 (MetaMask)
 */
export const executeCrossChainShield = async (
  railgunAddress: string,
  evmAdaptAddress: string,
  tokenAddress: string,
  amount: bigint,
  signer: JsonRpcSigner | Wallet
) => {
  console.log("🚀 開始準備跨鏈 Shield...");

  // 1. 檢查並執行 Approve
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer) as any;
  const ownerAddress = await signer.getAddress();
  
  console.log("🔍 檢查 Allowance...");
  const currentAllowance: bigint = await tokenContract.allowance(ownerAddress, evmAdaptAddress);
  
  if (currentAllowance < amount) {
    console.log("⏳ 額度不足，正在執行 Approve...");
    const approveTx = await tokenContract.approve(evmAdaptAddress, amount);
    await approveTx.wait();
    console.log("✅ Approve 成功！");
  } else {
    console.log("✅ 額度已足夠，跳過 Approve。");
  }

  // 2. 產生 Shield 請求資料 (Note)
  // 我們使用本地的 Provider Wallet 來產生 Shield Signature (用來加密 Note)
  // 這樣只有持有該錢包私鑰的人 (也就是你) 能在 ZetaChain 上解密
  const { wallet: identityWallet } = getProviderWallet();
  const shieldPrivateKey = await getShieldSignature(identityWallet);
  
  // 產生 16 bytes 隨機數 (用於混淆 Note)
  const random = ByteUtils.randomHex(16);

  const shieldRequests = await generateERC20ShieldRequests(
    serializeERC20Transfer(tokenAddress, amount, railgunAddress),
    random,
    shieldPrivateKey,
  );

  // 3. 建立 Adapt 合約並發送交易
  console.log("📤 發送 shieldOnZetachain 交易...");
  const evmAdapt = new Contract(evmAdaptAddress, EVM_ADAPT_ABI, signer) as any;
  
  // value: 0n 代表不支付額外的跨鏈手續費 (假設測試網不需要，或已包含在 Gas)
  const tx: ContractTransactionResponse = await evmAdapt.shieldOnZetachain(
    [shieldRequests], 
    { value: 0n }
  );

  console.log(`✅ 交易已發送: ${tx.hash}`);
  return tx; // 回傳交易物件
};