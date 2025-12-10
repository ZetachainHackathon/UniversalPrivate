// apps/web/lib/railgun/cross-chain-shield.ts

import { Contract, type Wallet, type JsonRpcSigner, ZeroAddress } from "ethers";
import { ByteUtils } from "@railgun-community/engine";

import {
    getShieldSignature,
    generateERC20ShieldRequests,
    serializeERC20Transfer,
} from "./transaction-utils";
import { getProviderWallet } from "@/lib/utils";

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

// ERC20 ABI for Approve
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)"
];

/**
 * 執行跨鏈 Shield
 * ⚠️ 關鍵：這裡的 signer 必須是從前端傳來的 MetaMask JsonRpcSigner
 */
export const executeCrossChainShield = async (
    railgunAddress: string,
    evmAdaptAddress: string,
    tokenAddress: string,
    amount: bigint,
    signer: JsonRpcSigner | Wallet, // 👈 這裡接收 MetaMask Signer
    shouldUseNativeAsset: boolean = false // 👈 新增參數：是否強制使用原生代幣支付
) => {
    console.log("🚀 開始準備跨鏈 Shield...");

    // 0. 檢查 Signer
    if (!signer) throw new Error("缺少 Signer，無法簽署交易");

    // 1. 判斷代幣類型 (Native ETH 還是 ERC20)
    // 如果 tokenAddress 是零地址，或是使用者強制指定使用原生代幣 (例如跨鏈時指定 ZRC20 但付的是 ETH)
    const isNativePay = tokenAddress === ZeroAddress || shouldUseNativeAsset;
    let valueToSend = 0n;

    if (isNativePay) {
        console.log("ETH 模式: 使用原生代幣支付 (跳過 Approve)。");
        valueToSend = amount;
    } else {
        console.log("ERC20 模式: 檢查 Allowance...");
        const erc20 = new Contract(tokenAddress, ERC20_ABI, signer) as any;
        const ownerAddress = await signer.getAddress();
        const currentAllowance = await erc20.allowance(ownerAddress, evmAdaptAddress);
        
        if (currentAllowance < amount) {
            console.log(`Allowance 不足 (${currentAllowance} < ${amount})，執行 Approve...`);
            const approveTx = await erc20.approve(evmAdaptAddress, amount);
            await approveTx.wait();
            console.log("✅ Approve 完成");
        } else {
            console.log("✅ Allowance 足夠，跳過 Approve");
        }
        valueToSend = 0n;
    }


    const { wallet: identityWallet } = getProviderWallet();
    const shieldPrivateKey = await getShieldSignature(identityWallet);
    const random = ByteUtils.randomHex(16);

    const shieldRequests = await generateERC20ShieldRequests(
        serializeERC20Transfer(tokenAddress, amount, railgunAddress),
        random,
        shieldPrivateKey,
    );
    const evmAdapt = new Contract(evmAdaptAddress, EVM_ADAPT_ABI, signer) as any;

    // 修正：只有 Native Token 才傳送 value
    const tx = await evmAdapt.shieldOnZetachain(
        [shieldRequests],
        { value: valueToSend }
    );

    console.log(`✅ 交易已廣播: ${tx.hash}`);

    return tx;
};