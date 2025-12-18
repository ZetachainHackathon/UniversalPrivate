import { JsonRpcSigner, Wallet, ZeroAddress } from "ethers";
import { executeCrossChainShield as sdkExecuteCrossChainShield } from "@repo/sdk";
import { CONFIG } from "@/config/env";
import { TEST_NETWORK } from "@/constants";

/**
 * 執行跨鏈 Shield
 * ⚠️ 關鍵：這裡的 signer 必須是從前端傳來的 MetaMask JsonRpcSigner
 * @param shieldTokenAddress 在 Shield Request 中使用的 ZRC20 地址（如果是 Native Token，應傳入對應鏈的 ZRC20_GAS 地址）
 */
export const executeCrossChainShield = async (
    railgunAddress: string,
    evmAdaptAddress: string,
    tokenAddress: string,
    amount: bigint,
    signer: JsonRpcSigner | Wallet,
    shouldUseNativeAsset: boolean = false,
    shieldTokenAddress?: string // 可選：明確指定 Shield Request 中的 ZRC20 地址
) => {
    // 決定 Shield Request 中要使用的 Token Address
    // 如果提供了 shieldTokenAddress，優先使用它
    // 否則，如果是 Native Token (ZeroAddress)，使用 Sepolia 的地址作為 fallback（向後兼容）
    // 注意：調用者應該根據當前鏈傳入正確的 ZRC20_GAS 地址
    const finalShieldTokenAddress = shieldTokenAddress || 
        ((tokenAddress === ZeroAddress) ? CONFIG.CONTRACTS.TEST_ERC20 : tokenAddress);

    return sdkExecuteCrossChainShield(
        TEST_NETWORK,
        railgunAddress,
        evmAdaptAddress,
        finalShieldTokenAddress,
        amount,
        signer,
        shouldUseNativeAsset
    );
};
