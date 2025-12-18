import {
    executeTransfer as sdkExecuteTransfer,
    executeTransferFromEvm as sdkExecuteTransferFromEvm
} from "@st99005912/universal-private-sdk";
import { JsonRpcSigner, Wallet } from "ethers";
import { TEST_NETWORK } from "@/constants";
import { getEncryptionKeyFromPassword } from "./encryption";
import { CONFIG } from "@/config/env";

/**
 * Execute an internal 0zk -> 0zk transfer.
 * This function currently implements a **Self-Signed** transaction flow for simplicity.
 * In production, this should ideally use a Relayer to maximize privacy.
 */
export const executeTransfer = async (
    walletId: string,
    recipientAddress: string,
    amount: bigint,
    tokenAddress: string,
    password: string,
    signer: JsonRpcSigner | Wallet
) => {
    const encryptionKey = await getEncryptionKeyFromPassword(password);
    return sdkExecuteTransfer(
        TEST_NETWORK,
        walletId,
        recipientAddress,
        amount,
        tokenAddress,
        encryptionKey,
        signer
    );
};

export const executeTransferFromEvm = async (
    walletId: string,
    recipientAddress: string,
    amount: bigint,
    tokenAddress: string,
    password: string,
    signer: JsonRpcSigner | Wallet,
    sourceChain: string
) => {
    const encryptionKey = await getEncryptionKeyFromPassword(password);
    
    type ChainKey = keyof typeof CONFIG.CHAINS;
    
    if (!(sourceChain in CONFIG.CHAINS)) {
        throw new Error(`Unknown chain: ${sourceChain}. Available chains: ${Object.keys(CONFIG.CHAINS).join(", ")}`);
    }
    
    const chainConfig = CONFIG.CHAINS[sourceChain as ChainKey];
    
    // 檢查是否有 EVM_ADAPT 屬性（ZETACHAIN 沒有）
    if (!("EVM_ADAPT" in chainConfig)) {
        throw new Error(`Chain ${sourceChain} does not support EVMAdapt (it may be ZetaChain)`);
    }
    
    const evmAdaptAddress = (chainConfig as { EVM_ADAPT?: string }).EVM_ADAPT;
    if (!evmAdaptAddress || evmAdaptAddress === "") {
        throw new Error(`EVMAdapt address not configured for ${sourceChain}`);
    }

    return sdkExecuteTransferFromEvm(
        TEST_NETWORK,
        walletId,
        recipientAddress,
        amount,
        tokenAddress,
        encryptionKey,
        signer,
        evmAdaptAddress
    );
};
