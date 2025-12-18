import {
    executeCrossChainTransfer as sdkExecuteCrossChainTransfer,
    executeCrossChainTransferFromEvm as sdkExecuteCrossChainTransferFromEvm
} from "@repo/sdk";
import { JsonRpcSigner, Wallet, parseUnits, ZeroAddress } from "ethers";
import { TEST_NETWORK } from "@/constants";
import { CONFIG } from "@/config/env";
import { getTokenDecimals } from "./token-utils";
import { getEncryptionKeyFromPassword } from "./encryption";

// Contract Addresses
const ZETACHAIN_ADAPT = CONFIG.CHAINS.ZETACHAIN.ZETACHAIN_ADAPT;

// Helper function to convert target chain to chain key
const targetChainToChainKey = (targetChain: string): keyof typeof CONFIG.CHAINS => {
    const chainKey = targetChain.toUpperCase().replace(/-/g, "_") as keyof typeof CONFIG.CHAINS;
    if (!(chainKey in CONFIG.CHAINS)) {
        throw new Error(`Unknown target chain: ${targetChain}`);
    }
    return chainKey;
};

// Helper function to get ZRC20_GAS address based on target chain
const getTargetZRC20 = (targetChain: string): string => {
    const chainKey = targetChainToChainKey(targetChain);
    const chainConfig = CONFIG.CHAINS[chainKey];
    
    if (!("ZRC20_GAS" in chainConfig) || !chainConfig.ZRC20_GAS) {
        throw new Error(`Chain ${chainKey} does not have ZRC20_GAS configured`);
    }
    
    return chainConfig.ZRC20_GAS;
};

export const executeCrossChainTransferOnZetaChain = async (
    password: string, // 注意：這裡實際上是密碼，需要轉換為加密密鑰
    railgunWalletId: string,
    amount: string,
    recipientAddress: string,
    signer: JsonRpcSigner | Wallet,
    targetChain: string,
    tokenAddress: string,
    targetTokenAddress?: string
) => {
    if (!signer.provider) {
        throw new Error("無法獲取 Provider");
    }
    const decimals = await getTokenDecimals(tokenAddress, signer.provider);
    const amountBigInt = parseUnits(amount, decimals);
    
    // 將密碼轉換為加密密鑰
    const encryptionKey = await getEncryptionKeyFromPassword(password);

    // Map token address to WZETA if native
    let tokenAddressOnZetachain = tokenAddress;
    if (tokenAddress === ZeroAddress) {
        tokenAddressOnZetachain = CONFIG.TOKENS.WZETA.address;
    }

    // Use targetTokenAddress if provided, otherwise fall back to ZRC20_GAS
    const targetZrc20Address = (targetTokenAddress && targetTokenAddress !== "" && targetTokenAddress !== ZeroAddress)
        ? targetTokenAddress
        : getTargetZRC20(targetChain);

    // Calculate amount after fee
    const unshieldFeeBasisPoints = CONFIG.FEES.UNSHIELD_BASIS_POINTS;
    const amountAfterFee = (amountBigInt * (10000n - unshieldFeeBasisPoints)) / 10000n;

    return sdkExecuteCrossChainTransfer(
        TEST_NETWORK,
        ZETACHAIN_ADAPT,
        railgunWalletId,
        encryptionKey,
        amountBigInt,
        amountAfterFee,
        tokenAddressOnZetachain,
        targetZrc20Address,
        recipientAddress,
        signer
    );
};

export const executeCrossChainTransferFromEvm = async (
    railgunWalletId: string,
    recipientAddress: string,
    amount: bigint,
    tokenAddress: string,
    password: string, // 注意：這裡實際上是密碼，需要轉換為加密密鑰
    signer: JsonRpcSigner | Wallet,
    sourceChain: string,
    targetChain: string,
    targetTokenAddress?: string
) => {
    // 將密碼轉換為加密密鑰
    const encryptionKey = await getEncryptionKeyFromPassword(password);
    
    type ChainKey = keyof typeof CONFIG.CHAINS;
    if (!(sourceChain in CONFIG.CHAINS)) {
        throw new Error(`Unknown chain: ${sourceChain}. Available chains: ${Object.keys(CONFIG.CHAINS).join(", ")}`);
    }
    const chainConfig = CONFIG.CHAINS[sourceChain as ChainKey];
    if (!("EVM_ADAPT" in chainConfig)) {
        throw new Error(`Chain ${sourceChain} does not support EVMAdapt (it may be ZetaChain)`);
    }
    const evmAdaptAddress = (chainConfig as { EVM_ADAPT?: string }).EVM_ADAPT;
    if (!evmAdaptAddress || evmAdaptAddress === "") {
        throw new Error(`EVMAdapt address not configured for ${sourceChain}`);
    }

    // Map token address to ZRC20 address on Zetachain
    let tokenAddressOnZetachain = tokenAddress;
    if (tokenAddress === ZeroAddress) {
        if ("ZRC20_GAS" in chainConfig && chainConfig.ZRC20_GAS) {
            tokenAddressOnZetachain = chainConfig.ZRC20_GAS;
        } else {
             throw new Error(`ZRC20_GAS not configured for ${sourceChain}`);
        }
    }

    // Calculate amount after fee
    const unshieldFeeBasisPoints = CONFIG.FEES.UNSHIELD_BASIS_POINTS;
    const amountAfterFee = (amount * (10000n - unshieldFeeBasisPoints)) / 10000n;

    // Use targetTokenAddress if provided, otherwise fall back to ZRC20_GAS
    const targetZrc20Address = (targetTokenAddress && targetTokenAddress !== "" && targetTokenAddress !== ZeroAddress)
        ? targetTokenAddress
        : getTargetZRC20(targetChain);

    return sdkExecuteCrossChainTransferFromEvm(
        TEST_NETWORK,
        ZETACHAIN_ADAPT,
        railgunWalletId,
        encryptionKey,
        amount,
        amountAfterFee,
        tokenAddressOnZetachain,
        targetZrc20Address,
        recipientAddress,
        signer,
        evmAdaptAddress
    );
};

/**
 * 根據當前連接的鏈執行跨鏈轉帳
 * @param password 密碼（將被轉換為加密密鑰）
 */
export const executeCrossChainTransfer = async (
    password: string, // 注意：這裡實際上是密碼，需要轉換為加密密鑰
    railgunWalletId: string,
    amount: string,
    recipientAddress: string,
    signer: JsonRpcSigner | Wallet,
    sourceChain: string,
    targetChain: string,
    tokenAddress: string,
    targetTokenAddress?: string
) => {
    const sourceChainUpper = sourceChain.toUpperCase();
    const isZetachain = sourceChainUpper === "ZETACHAIN" || sourceChainUpper === "ZETACHAIN_TESTNET";
    
    if (isZetachain) {
        return await executeCrossChainTransferOnZetaChain(
            password,
            railgunWalletId,
            amount,
            recipientAddress,
            signer,
            targetChain,
            tokenAddress,
            targetTokenAddress
        );
    } else {
        if (!signer.provider) {
            throw new Error("Signer must have a provider");
        }
        const amountBigInt = parseUnits(amount, await getTokenDecimals(tokenAddress, signer.provider));
        const chainKey = sourceChainUpper as keyof typeof CONFIG.CHAINS;
        
        return await executeCrossChainTransferFromEvm(
            railgunWalletId,
            recipientAddress,
            amountBigInt,
            tokenAddress,
            password,
            signer,
            chainKey,
            targetChain,
            targetTokenAddress
        );
    }
};
