import {
    Contract,
    type JsonRpcSigner,
    type Wallet,
    ZeroAddress,
    parseUnits,
    getBytes,
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
// import { overrideArtifact } from "@railgun-community/wallet";
// import { getArtifact, listArtifacts } from "railgun-circuit-test-artifacts";

// Constants from test/unshield.ts
const ZRC20_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // ZETACHAIN ETH
const TARGET_ZRC20_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // Target Chain Token
const ZETACHAIN_ADAPT_ADDRESS = "0xa69D6437F95C116eF70BCaf3696b186DFF6aCD49";
const EVM_ADAPT_ADDRESS = "0xbC3Da3B1890ED501F0d357b12BB834810c34d71E"; // Sepolia EVMAdapt

// ABIs
const ZRC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
const ZETACHAIN_ADAPT_ABI = [
    "function withdraw(bytes receiver, uint256 amount, address zrc20, address targetZrc20, uint256 gasLimit, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions) external",
];
const EVM_ADAPT_ABI = [
    "function unshieldOutsideChain(bytes calldata _unshieldOutsideChainData) external payable",
];

// const setupZetachainOverrides = () => {
//   // Override Artifacts
//   const artifacts = listArtifacts();
//   for (const artifactConfig of artifacts) {
//     const artifact = getArtifact(artifactConfig.nullifiers, artifactConfig.commitments);
//     const variant = `${artifactConfig.nullifiers}x${artifactConfig.commitments}`;
//     overrideArtifact(variant, {
//       ...artifact,
//       dat: undefined
//     });
//   }
//   console.log("Overridden artifacts with test artifacts");
// }

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
        // Handle proof progress (show in UI).
        // Proofs can take 20-30 seconds on slower devices.
        console.log("CrossContract Call Proof progress: ", progress);
    };
    // GENERATES RAILGUN SPENDING PROOF
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const engine = getEngine();
    console.log("Syncing engine...");
    await engine.scanContractHistory(NETWORK_CONFIG[TEST_NETWORK].chain, undefined);
    console.log("Engine synced.");

    // Constants
    const GAS_LIMIT = 500000n;
    const unshieldFeeBasisPoints = 25n;
    const amountAfterFee = (amount * (10000n - unshieldFeeBasisPoints)) / 10000n;
    const ZERO_ADDRESS = ZeroAddress;

    // 1. Prepare Cross-Contract Calls
    // A. Transfer ZRC20 to ZetachainAdapt
    const zrc20 = new Contract(ZRC20_ADDRESS, ZRC20_ABI, signer.provider) as any;
    const transferData = await zrc20.transfer.populateTransaction(
        ZETACHAIN_ADAPT_ADDRESS,
        amountAfterFee
    );

    // B. Call withdraw on ZetachainAdapt
    const zetachainAdaptContract = new Contract(
        ZETACHAIN_ADAPT_ADDRESS,
        ZETACHAIN_ADAPT_ABI,
        signer.provider
    ) as any;
    const withdrawData = await zetachainAdaptContract.withdraw.populateTransaction(
        getBytes(recipientAddress), // bytes receiver
        amountAfterFee,
        ZRC20_ADDRESS,
        TARGET_ZRC20_ADDRESS,
        GAS_LIMIT,
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
        serializeERC20RelayAdaptUnshield(ZRC20_ADDRESS, amount),
    ];

    // 3. Estimate Gas
    const minGasLimit = 1_000_000n;
    const sendWithPublicWallet = true;

    const originalGasDetails = await getOriginalGasDetailsForTransaction(
        TEST_NETWORK,
        sendWithPublicWallet,
        signer
    );

    console.log("⏳ Estimating Gas for Cross-Chain Transfer...");
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
    console.log("✅ Gas Estimate:", gasEstimate);

    // 4. Get Gas Details & Calculate Price
    const transactionGasDetails = await getGasDetailsForTransaction(
        TEST_NETWORK,
        gasEstimate,
        sendWithPublicWallet,
        signer as any
    );
    const overallBatchMinGasPrice = calculateGasPrice(transactionGasDetails);

    // setupZetachainOverrides();
    // 5. Generate Proof

    // generate proof
    console.log("⏳ Generating Proof...");
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
    console.log("✅ Proof Generated");

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
    amount: string, // User input string (e.g. "0.01")
    recipientAddress: string,
    signer: JsonRpcSigner | Wallet
) => {
    // Convert amount to BigInt (Assuming 18 decimals for now as per test)
    const amountBigInt = parseUnits(amount, 18);

    console.log("🚀 Starting Cross-Chain Transfer...");
    console.log("Amount:", amount);
    console.log("Recipient:", recipientAddress);

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

    // Note: The test sends 100000000000000n value (0.0001 ETH) as cross-chain fee?
    // In test/unshield.ts: { value: 100000000000000n }
    const CROSS_CHAIN_FEE = 100000000000000n;

    console.log("⏳ Sending Transaction to EVMAdapt...");
    const tx = await evmAdaptContract.getFunction("unshieldOutsideChain")(unshieldOutsideChainData, {
        value: CROSS_CHAIN_FEE,
    });

    console.log("✅ Transaction Sent:", tx.hash);
    return tx;
};