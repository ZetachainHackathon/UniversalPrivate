import {
    TXIDVersion,
    NetworkName,
    RailgunERC20AmountRecipient,
    calculateGasPrice,
} from "@railgun-community/shared-models";
import {
    gasEstimateForUnprovenTransfer,
    generateTransferProof,
    populateProvedTransfer,
} from "@railgun-community/wallet";
import { TransactionResponse, JsonRpcSigner, Wallet } from "ethers";
import { TEST_NETWORK } from "@/constants";
import { getEncryptionKeyFromPassword } from "./encryption";
import { getGasDetailsForTransaction, getOriginalGasDetailsForTransaction } from "./transaction-utils";

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
    signer: JsonRpcSigner | Wallet // Needed for self-signing
): Promise<TransactionResponse> => {

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
        signer as any
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

    // 6. Send Transaction
    const txRequest = transaction.transaction;
    const tx = await signer.sendTransaction(txRequest);

    return tx;
};
