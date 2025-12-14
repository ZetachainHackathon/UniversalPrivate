import {
    Contract,
    type JsonRpcSigner,
    type Wallet,
    ZeroAddress,
    parseUnits,
    ContractTransaction,
} from "ethers";
import {
    getEngine,
    gasEstimateForUnprovenCrossContractCalls,
    generateCrossContractCallsProof,
    populateProvedCrossContractCalls,
} from "@railgun-community/wallet";
import {
    RailgunERC20Amount,
    calculateGasPrice,
    TXIDVersion,
    NETWORK_CONFIG,
    RailgunNFTAmount,
    RailgunNFTAmountRecipient,
    RailgunERC20Recipient,
    RailgunERC20AmountRecipient,
    NetworkName,
} from "@railgun-community/shared-models";
import { getEncryptionKeyFromPassword } from "./encryption";
import {
    serializeERC20RelayAdaptUnshield,
    getGasDetailsForTransaction,
    getOriginalGasDetailsForTransaction,
} from "./transaction-utils";
import { TEST_NETWORK } from "@/constants";
import { CONFIG } from "@/config/env";

// Contract Addresses
const {
    ZRC20_ETH,
    TARGET_ZRC20,
    ZETACHAIN_ADAPT,
    DEFAULT_ADAPT: EVM_ADAPT_ADDRESS
} = CONFIG.CONTRACTS;

// ABIs
const ZRC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
const ZETACHAIN_ADAPT_ABI = [
    "function withdraw(bytes receiver, uint256 amount, address zrc20, address targetZrc20, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions) external",
];
const EVM_ADAPT_ABI = [
    "function unshieldOutsideChain(bytes calldata _unshieldOutsideChainData) external payable",
];

export const crossContractGenerateProof = async (
    encryptionKey: string,
    network: NetworkName,
    railgunWalletID: string,
    erc20AmountUnshieldAmounts: RailgunERC20Amount[],
    erc721AmountUnshieldAmounts: RailgunNFTAmount[],
    erc20AmountShieldRecipients: RailgunERC20Recipient[],
    erc721AmountShieldRecipients: RailgunNFTAmountRecipient[],
    crossContractCalls: ContractTransaction[],
    overallBatchMinGasPrice: bigint,
    minGasLimit: bigint,
    sendWithPublicWallet: boolean = true,
    broadcasterFeeERC20AmountRecipient:
        | RailgunERC20AmountRecipient
        | undefined = undefined
) => {
    const progressCallback = (progress: number) => {
        // Optional: Dispatch logging event or use a proper logger
        // console.log("CrossContract Call Proof progress: ", progress);
    };

    await generateCrossContractCallsProof(
        TXIDVersion.V2_PoseidonMerkle,
        network,
        railgunWalletID,
        encryptionKey,
        erc20AmountUnshieldAmounts,
        erc721AmountUnshieldAmounts,
        erc20AmountShieldRecipients,
        erc721AmountShieldRecipients,
        crossContractCalls,
        broadcasterFeeERC20AmountRecipient,
        sendWithPublicWallet,
        overallBatchMinGasPrice,
        minGasLimit,
        progressCallback
    );
};

export const generateUnshieldOutsideChainData = async (
    password: string,
    railgunWalletId: string,
    amount: bigint,
    recipientAddress: string,
    signer: JsonRpcSigner | Wallet
) => {
    const encryptionKey = await getEncryptionKeyFromPassword(password);
    const engine = getEngine();

    // 0. Sync Engine
    await engine.scanContractHistory(NETWORK_CONFIG[TEST_NETWORK].chain, undefined);

    // Constants
    const unshieldFeeBasisPoints = 25n;
    const amountAfterFee = (amount * (10000n - unshieldFeeBasisPoints)) / 10000n;
    const ZERO_ADDRESS = ZeroAddress;

    // 1. Prepare Cross-Contract Calls
    // A. Transfer ZRC20 to ZetachainAdapt
    const zrc20 = new Contract(ZRC20_ETH, ZRC20_ABI, signer.provider) as any;
    const transferData = await zrc20.transfer.populateTransaction(
        ZETACHAIN_ADAPT,
        amountAfterFee
    );

    // B. Call withdraw on ZetachainAdapt
    const zetachainAdaptContract = new Contract(
        ZETACHAIN_ADAPT,
        ZETACHAIN_ADAPT_ABI,
        signer.provider
    ) as any;
    const withdrawData = await zetachainAdaptContract.withdraw.populateTransaction(
        recipientAddress, // bytes receiver
        amountAfterFee,
        ZRC20_ETH,
        TARGET_ZRC20,
        {
            revertAddress: ZERO_ADDRESS,
            callOnRevert: false,
            abortAddress: ZERO_ADDRESS,
            revertMessage: "0x",
            onRevertGasLimit: 0,
        }
    );

    const crossContractCalls: ContractTransaction[] = [
        {
            to: transferData.to!,
            data: transferData.data!,
            value: 0n,
        },
        {
            to: withdrawData.to!,
            data: withdrawData.data!,
            value: 0n,
        },
    ];

    // 2. Prepare Unshield Amounts
    const erc20AmountUnshieldAmounts: RailgunERC20Amount[] = [
        serializeERC20RelayAdaptUnshield(ZRC20_ETH, amount),
    ];

    // 3. Estimate Gas
    const minGasLimit = 1_000_000n;
    const sendWithPublicWallet = true;

    const originalGasDetails = await getOriginalGasDetailsForTransaction(
        TEST_NETWORK,
        sendWithPublicWallet,
        signer
    );

    const { gasEstimate } = await gasEstimateForUnprovenCrossContractCalls(
        TXIDVersion.V2_PoseidonMerkle,
        TEST_NETWORK,
        railgunWalletId,
        encryptionKey,
        erc20AmountUnshieldAmounts,
        [], // erc721AmountUnshieldAmounts
        [], // erc20ShieldRecipients
        [], // erc721AmountShieldRecipients
        crossContractCalls,
        originalGasDetails,
        undefined, // feeTokenDetails
        sendWithPublicWallet,
        minGasLimit
    );

    // 4. Get Gas Details & Calculate Price
    const transactionGasDetails = await getGasDetailsForTransaction(
        TEST_NETWORK,
        gasEstimate,
        sendWithPublicWallet,
        signer as any
    );
    const overallBatchMinGasPrice = calculateGasPrice(transactionGasDetails);

    // 5. Generate Proof
    await crossContractGenerateProof(
        encryptionKey,
        TEST_NETWORK,
        railgunWalletId,
        erc20AmountUnshieldAmounts,
        [],
        [],
        [],
        crossContractCalls,
        overallBatchMinGasPrice,
        minGasLimit,
        true
    );

    // 6. Populate Transaction
    const transaction = await populateProvedCrossContractCalls(
        TXIDVersion.V2_PoseidonMerkle,
        TEST_NETWORK,
        railgunWalletId,
        erc20AmountUnshieldAmounts,
        [],
        [],
        [],
        crossContractCalls,
        undefined,
        sendWithPublicWallet,
        overallBatchMinGasPrice,
        transactionGasDetails
    );

    return transaction.transaction.data;
};

export const executeCrossChainTransfer = async (
    password: string,
    railgunWalletId: string,
    amount: string,
    recipientAddress: string,
    signer: JsonRpcSigner | Wallet
) => {
    const amountBigInt = parseUnits(amount, 18);

    // 1. Generate the data payload
    const unshieldOutsideChainData = await generateUnshieldOutsideChainData(
        password,
        railgunWalletId,
        amountBigInt,
        recipientAddress,
        signer
    );

    // 2. Call EVMAdapt contract
    const evmAdaptContract = new Contract(EVM_ADAPT_ADDRESS, EVM_ADAPT_ABI, signer);

    const CROSS_CHAIN_FEE = 100000000000000n; // 0.0001 ETH

    const tx = await evmAdaptContract.getFunction("unshieldOutsideChain")(unshieldOutsideChainData, {
        value: CROSS_CHAIN_FEE,
    });

    return tx;
};