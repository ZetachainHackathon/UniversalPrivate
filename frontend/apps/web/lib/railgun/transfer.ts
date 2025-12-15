import {
    TXIDVersion,
    NetworkName,
    RailgunERC20AmountRecipient,
    calculateGasPrice,
    RailgunPopulateTransactionResponse,
} from "@railgun-community/shared-models";
import {
    gasEstimateForUnprovenTransfer,
    generateTransferProof,
    populateProvedTransfer,
} from "@railgun-community/wallet";
import { TransactionResponse, JsonRpcSigner, Wallet, Contract } from "ethers";
import { TEST_NETWORK } from "@/constants";
import { getEncryptionKeyFromPassword } from "./encryption";
import { getGasDetailsForTransaction, getOriginalGasDetailsForTransaction } from "./transaction-utils";
import { CONFIG } from "@/config/env";

/**
 * Execute an internal 0zk -> 0zk transfer.
 * This function currently implements a **Self-Signed** transaction flow for simplicity.
 * In production, this should ideally use a Relayer to maximize privacy.
 */
const generateTransferTransaction = async (
    walletId: string,
    recipientAddress: string,
    amount: bigint,
    tokenAddress: string,
    password: string,
    signer: JsonRpcSigner | Wallet // Needed for self-signing
): Promise<RailgunPopulateTransactionResponse> => {


    const encryptionKey = await getEncryptionKeyFromPassword(password);
    const sendWithPublicWallet = true; // Self-signing

    // 1. Prepare Recipients
    const erc20AmountRecipients: RailgunERC20AmountRecipient[] = [
        {
            tokenAddress,
            amount,
            recipientAddress,
        },
    ];

    // 2. Estimate Gas
    const originalGasDetails = await getOriginalGasDetailsForTransaction(
        TEST_NETWORK,
        sendWithPublicWallet,
        signer
    );

    const { gasEstimate } = await gasEstimateForUnprovenTransfer(
        TXIDVersion.V2_PoseidonMerkle,
        TEST_NETWORK,
        walletId,
        encryptionKey,
        erc20AmountRecipients,
        [], // extra erc20/nft array slot ?
        [], // nftRecipients (Arg 7)
        originalGasDetails,
        undefined, // feeTokenDetails
        sendWithPublicWallet
    );

    // 3. Prepare Gas Details
    const transactionGasDetails = await getGasDetailsForTransaction(
        TEST_NETWORK,
        gasEstimate,
        sendWithPublicWallet,
        signer
    );
    const overallBatchMinGasPrice = calculateGasPrice(transactionGasDetails);

    // 4. Generate Proof
    await generateTransferProof(
        TXIDVersion.V2_PoseidonMerkle,
        TEST_NETWORK,
        walletId,
        encryptionKey,
        false, // showSenderAddressToRecipient
        undefined, // memoText
        erc20AmountRecipients,
        [], // nftRecipients
        undefined, // relayerFee
        sendWithPublicWallet,
        overallBatchMinGasPrice,
        () => { } // progressCallback
    );

    // 5. Populate Transaction
    const transaction = await populateProvedTransfer(
        TXIDVersion.V2_PoseidonMerkle,
        TEST_NETWORK,
        walletId,
        false, // showSenderAddressToRecipient
        undefined, // memoText
        erc20AmountRecipients,
        [], // nftRecipients
        undefined, // relayerFee
        sendWithPublicWallet,
        overallBatchMinGasPrice,
        transactionGasDetails,
    );
    return transaction;
};

export const executeTransfer = async (
    walletId: string,
    recipientAddress: string,
    amount: bigint,
    tokenAddress: string,
    password: string,
    signer: JsonRpcSigner | Wallet
) => {
    const transaction = await generateTransferTransaction(walletId, recipientAddress, amount, tokenAddress, password, signer);
    const tx = await signer.sendTransaction(transaction.transaction);
    return tx;
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
    // 1) 產生在 Zetachain 上執行的 Railgun 轉帳交易資料
    const transaction = await generateTransferTransaction(walletId, recipientAddress, amount, tokenAddress, password, signer);
    const transactData = transaction.transaction.data;

    // 2) 取得來源鏈對應的 EVMAdapt 地址
    
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

    // 3) 透過來源鏈的 EVMAdapt 將 transactData 轉送到 Zetachain
    const evmAdaptContract = new Contract(
        evmAdaptAddress,
        [
            "function transactOnZetachain(bytes calldata _transactData) external",
        ],
        signer
    );
    const tx = await evmAdaptContract.transactOnZetachain(transactData);
    return tx;
};
