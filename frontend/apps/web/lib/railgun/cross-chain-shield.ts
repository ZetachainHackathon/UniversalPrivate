import { JsonRpcSigner, Wallet, ZeroAddress } from "ethers";
import { executeCrossChainShield as sdkExecuteCrossChainShield } from "@repo/sdk";
import { CONFIG } from "@/config/env";
import { TEST_NETWORK } from "@/constants";

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
    // 決定 Shield Request 中要使用的 Token Address
    // 如果是 Native Token (ZeroAddress)，在 Shield Request 中必須填入目標鏈上的 ZRC20 地址
    const shieldTokenAddress = (tokenAddress === ZeroAddress) ? CONFIG.CONTRACTS.TEST_ERC20 : tokenAddress;

    return sdkExecuteCrossChainShield(
        TEST_NETWORK,
        railgunAddress,
        evmAdaptAddress,
        shieldTokenAddress,
        amount,
        signer,
        shouldUseNativeAsset
    );
};
