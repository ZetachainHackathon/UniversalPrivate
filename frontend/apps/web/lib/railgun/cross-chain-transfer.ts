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
import { getTokenDecimals } from "./token-utils";

// Contract Addresses
const ZETACHAIN_ADAPT = CONFIG.CHAINS.ZETACHAIN.ZETACHAIN_ADAPT;

// Helper function to get ZRC20_GAS address based on target chain
const getTargetZRC20 = (targetChain: "sepolia" | "base-sepolia"): string => {
    const chainKey = targetChain === "base-sepolia" ? "BASE_SEPOLIA" : "SEPOLIA";
    return CONFIG.CHAINS[chainKey].ZRC20_GAS;
};

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
    signer: JsonRpcSigner | Wallet,
    targetChain: "sepolia" | "base-sepolia",
    tokenAddress: string
) => {
    const encryptionKey = await getEncryptionKeyFromPassword(password);
    const engine = getEngine();

    // 0. Sync Engine
    await engine.scanContractHistory(NETWORK_CONFIG[TEST_NETWORK].chain, undefined);

    // Constants
    const unshieldFeeBasisPoints = CONFIG.FEES.UNSHIELD_BASIS_POINTS;
    const amountAfterFee = (amount * (10000n - unshieldFeeBasisPoints)) / 10000n;
    const ZERO_ADDRESS = ZeroAddress;

    // Get chain-specific addresses
    const TARGET_ZRC20 = getTargetZRC20(targetChain);
    // ZRC20_ETH is the ZRC20 token on ZetaChain that will be transferred to ZetachainAdapt
    // Use the token address provided by the user
    const ZRC20_ETH = tokenAddress;

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
    const minGasLimit = CONFIG.GAS.MIN_LIMIT_CROSS_CHAIN;
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
        signer
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

    return {
        to: transaction.transaction.to,
        data: transaction.transaction.data,
    };
};

export const executeCrossChainTransferOnZetaChain = async (
    password: string,
    railgunWalletId: string,
    amount: string,
    recipientAddress: string,
    signer: JsonRpcSigner | Wallet,
    targetChain: "sepolia" | "base-sepolia",
    tokenAddress: string
) => {
    // 獲取 Token decimals
    if (!signer.provider) {
        throw new Error("無法獲取 Provider");
    }
    const decimals = await getTokenDecimals(tokenAddress, signer.provider);
    const amountBigInt = parseUnits(amount, decimals);

    // 1. Generate the transaction data
    const { to, data } = await generateUnshieldOutsideChainData(
        password,
        railgunWalletId,
        amountBigInt,
        recipientAddress,
        signer,
        targetChain,
        tokenAddress
    );

    // 2. Send Transaction directly to Railgun Proxy
    // The "unshieldOutsideChain" wrapper is not needed/supported on ZetaChain's Adapt contract for this flow.
    // The ZK-proof internally calls ZETACHAIN_ADAPT.withdraw, so we just execute the proof on the Railgun contract.

    // Note: CROSS_CHAIN_FEE (value) might need to be passed if the Railgun contract or the internal call expects ETH.
    // However, usually the internal call uses the ZRC20 tokens. If an ETH fee is required (e.g. for gas on destination),
    // it must be handled carefully. For now, assuming standard 0zk transaction doesn't require ETH value attached 
    // unless shielding ETH. But here we are unshielding ZRC20.

    // If the "withdraw" function on ZETACHAIN_ADAPT requires native coin (Zeta) payment for cross-chain fee,
    // we might need to attach it. But Railgun "transact" wraps the call. 
    // If the contract is payable, we can attach value.

    // Let's assume for now we just send the transaction as generated by the SDK.
    // If a fee is needed, check if SDK included it in 'value' (SDK usually sets value to 0 for unshield).

    // User suggestion: "if not zetachain... call evmAdapt". 
    // checks: 
    // if ZetaChain: Direct call to Railgun.
    // if Sepolia: (Different path, likely not this function).

    console.log(`🚀 Sending Cross-Chain Transfer to ${to}...`);

    const tx = await signer.sendTransaction({
        to,
        data,
        // value: CONFIG.FEES.CROSS_CHAIN // Only attach if needed. ZETACHAIN_ADAPT.withdraw doesn't seem to take payable ETH, it takes ZRC20.
    });

    return tx;
};

export const executeCrossChainTransferFromEvm = async (
    railgunWalletId: string,
    recipientAddress: string,
    amount: bigint,
    tokenAddress: string,
    password: string,
    signer: JsonRpcSigner | Wallet,
    sourceChain: string,
    targetChain: "sepolia" | "base-sepolia"
) => {
    // 1) 產生在 Zetachain 上執行的跨鏈轉帳交易資料
    const { to, data } = await generateUnshieldOutsideChainData(
        password,
        railgunWalletId,
        amount,
        recipientAddress,
        signer,
        targetChain,
        tokenAddress
    );

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

    // 3) 透過來源鏈的 EVMAdapt 將 unshieldOutsideChainData 轉送到 Zetachain
    const evmAdaptContract = new Contract(
        evmAdaptAddress,
        EVM_ADAPT_ABI,
        signer
    );

    console.log(`🚀 Sending Cross-Chain Transfer from ${sourceChain} to ${targetChain} via EVMAdapt...`);

    const tx = await evmAdaptContract.unshieldOutsideChain!(data);
    return tx;
};

/**
 * 根據當前連接的鏈執行跨鏈轉帳
 * 自動選擇適當的執行方式：
 * - 如果在 Zetachain 上：直接執行
 * - 如果在其他 EVM 鏈上：通過 EVMAdapt 轉送到 Zetachain
 */
export const executeCrossChainTransfer = async (
    password: string,
    railgunWalletId: string,
    amount: string,
    recipientAddress: string,
    signer: JsonRpcSigner | Wallet,
    sourceChain: string,
    targetChain: "sepolia" | "base-sepolia",
    tokenAddress: string
) => {
    // 檢查來源鏈類型（支持大寫和小寫的鏈名稱）
    const sourceChainUpper = sourceChain.toUpperCase();
    const isZetachain = sourceChainUpper === "ZETACHAIN" || sourceChainUpper === "ZETACHAIN_TESTNET";
    
    if (isZetachain) {
        // 在 Zetachain 上直接執行
        return await executeCrossChainTransferOnZetaChain(
            password,
            railgunWalletId,
            amount,
            recipientAddress,
            signer,
            targetChain,
            tokenAddress
        );
    } else {
        // 在其他 EVM 鏈上，通過 EVMAdapt 轉送到 Zetachain
        if (!signer.provider) {
            throw new Error("Signer must have a provider");
        }
        const amountBigInt = parseUnits(amount, await getTokenDecimals(tokenAddress, signer.provider));
        
        // 確保使用大寫的鏈 key（與 CONFIG.CHAINS 的 key 格式一致）
        const chainKey = sourceChainUpper as keyof typeof CONFIG.CHAINS;
        return await executeCrossChainTransferFromEvm(
            railgunWalletId,
            recipientAddress,
            amountBigInt,
            tokenAddress,
            password,
            signer,
            chainKey,
            targetChain
        );
    }
};