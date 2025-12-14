import { Contract, type Wallet, type JsonRpcSigner, ZeroAddress } from "ethers";
import { ByteUtils } from "@railgun-community/engine";

import {
    getShieldSignature,
    generateERC20ShieldRequests,
    serializeERC20Transfer,
} from "./transaction-utils";
import { CONFIG } from "@/config/env";

// EVMAdapt 合約 ABI (使用更簡潔的 Human-Readable ABI)
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
    signer: JsonRpcSigner | Wallet,
    shouldUseNativeAsset: boolean = false
) => {
    // 0. 檢查 Signer
    if (!signer) throw new Error("缺少 Signer，無法簽署交易");

    // 1. 判斷代幣類型 (Native ETH 還是 ERC20)
    // 如果 tokenAddress 是零地址，或是使用者強制指定使用原生代幣 (例如跨鏈時指定 ZRC20 但付的是 ETH)
    const isNativePay = tokenAddress === ZeroAddress || shouldUseNativeAsset;
    let valueToSend = 0n;

    // 決定 Shield Request 中要使用的 Token Address
    // 如果是 Native Token (ZeroAddress)，在 Shield Request 中必須填入目標鏈上的 ZRC20 地址
    const shieldTokenAddress = (tokenAddress === ZeroAddress) ? CONFIG.CONTRACTS.TEST_ERC20 : tokenAddress;

    if (isNativePay) {
        // ETH 模式
        valueToSend = amount;
    } else {
        // ERC20 模式
        const erc20 = new Contract(tokenAddress, ERC20_ABI, signer) as any;
        const ownerAddress = await signer.getAddress();
        const currentAllowance = await erc20.allowance(ownerAddress, evmAdaptAddress);

        if (currentAllowance < amount) {
            console.log(`Allowance 不足 (${currentAllowance} < ${amount})，執行 Approve...`);
            const approveTx = await erc20.approve(evmAdaptAddress, amount);
            await approveTx.wait();
        }
        valueToSend = 0n;
    }

    const shieldPrivateKey = await getShieldSignature(signer as Wallet);
    const random = ByteUtils.randomHex(16);

    const shieldRequests = await generateERC20ShieldRequests(
        serializeERC20Transfer(shieldTokenAddress, amount, railgunAddress),
        random,
        shieldPrivateKey,
    );
    const evmAdapt = new Contract(evmAdaptAddress, EVM_ADAPT_ABI, signer) as any;

    // 修正：只有 Native Token 才傳送 value
    const tx = await evmAdapt.shieldOnZetachain(
        [shieldRequests],
        { value: valueToSend }
    );

    return tx;
};