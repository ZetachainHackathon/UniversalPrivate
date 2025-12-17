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
import { TransactionResponse, JsonRpcSigner, Wallet, Contract, HDNodeWallet } from "ethers";
import { getOriginalGasDetailsForTransaction, getGasDetailsForTransaction } from "./utils/transaction";

export const generateTransferTransaction = async (
    networkName: NetworkName,
    walletId: string,
    recipientAddress: string,
    amount: bigint,
    tokenAddress: string,
    encryptionKey: string,
    signer: JsonRpcSigner | Wallet | HDNodeWallet
): Promise<RailgunPopulateTransactionResponse> => {

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
        networkName,
        sendWithPublicWallet,
        signer
    );

    const { gasEstimate } = await gasEstimateForUnprovenTransfer(
        TXIDVersion.V2_PoseidonMerkle,
        networkName,
        walletId,
        encryptionKey,
        erc20AmountRecipients,
        [], // extra erc20/nft array slot
        [], // nftRecipients
        originalGasDetails,
        undefined, // feeTokenDetails
        sendWithPublicWallet
    );

    // 3. Prepare Gas Details
    const transactionGasDetails = await getGasDetailsForTransaction(
        networkName,
        gasEstimate,
        sendWithPublicWallet,
        signer
    );
    const overallBatchMinGasPrice = calculateGasPrice(transactionGasDetails);

    // 4. Generate Proof
    await generateTransferProof(
        TXIDVersion.V2_PoseidonMerkle,
        networkName,
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
        networkName,
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
    networkName: NetworkName,
    walletId: string,
    recipientAddress: string,
    amount: bigint,
    tokenAddress: string,
    encryptionKey: string,
    signer: JsonRpcSigner | Wallet | HDNodeWallet
) => {
    const transaction = await generateTransferTransaction(
        networkName,
        walletId,
        recipientAddress,
        amount,
        tokenAddress,
        encryptionKey,
        signer
    );
    const tx = await signer.sendTransaction(transaction.transaction);
    return tx;
};

export const executeTransferFromEvm = async (
    networkName: NetworkName,
    walletId: string,
    recipientAddress: string,
    amount: bigint,
    tokenAddress: string,
    encryptionKey: string,
    signer: JsonRpcSigner | Wallet | HDNodeWallet,
    evmAdaptAddress: string
) => {
    // 1) 產生在 Zetachain 上執行的 Railgun 轉帳交易資料
    const transaction = await generateTransferTransaction(
        networkName,
        walletId,
        recipientAddress,
        amount,
        tokenAddress,
        encryptionKey,
        signer
    );
    const transactData = transaction.transaction.data;

    // 2) 透過來源鏈的 EVMAdapt 將 transactData 轉送到 Zetachain
    const evmAdaptContract = new Contract(
        evmAdaptAddress,
        [
            "function transactOnZetachain(bytes calldata _transactData) external",
        ],
        signer
    );
    // @ts-ignore
    const tx = await evmAdaptContract.transactOnZetachain(transactData);
    return tx;
};
