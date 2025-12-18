import {
    Contract,
    type JsonRpcSigner,
    type Wallet,
    ZeroAddress,
    type HDNodeWallet,
    ContractTransaction,
} from "ethers";
import {
    gasEstimateForUnprovenCrossContractCalls,
    generateCrossContractCallsProof,
    populateProvedCrossContractCalls,
} from "@railgun-community/wallet";
import {
    RailgunERC20Amount,
    calculateGasPrice,
    TXIDVersion,
    RailgunNFTAmount,
    RailgunNFTAmountRecipient,
    RailgunERC20Recipient,
    RailgunERC20AmountRecipient,
    NetworkName,
} from "@railgun-community/shared-models";
import {
    serializeERC20RelayAdaptUnshield,
    getGasDetailsForTransaction,
    getOriginalGasDetailsForTransaction,
    generateERC20ShieldRequests,
} from "./utils/transaction";

// ABIs
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)"
];

const EVM_ADAPT_ABI = [
    {
        name: "shieldOnZetachain",
        type: "function",
        stateMutability: "payable",
        inputs: [
            {
                name: "_shieldRequests",
                type: "tuple[]",
                components: [
                    {
                        name: "preimage",
                        type: "tuple",
                        components: [
                            { name: "npk", type: "bytes32" },
                            {
                                name: "token",
                                type: "tuple",
                                components: [
                                    { name: "tokenType", type: "uint8" },
                                    { name: "tokenAddress", type: "address" },
                                    { name: "tokenSubID", type: "uint256" },
                                ],
                            },
                            { name: "value", type: "uint120" },
                        ],
                    },
                    {
                        name: "ciphertext",
                        type: "tuple",
                        components: [
                            { name: "encryptedBundle", type: "bytes32[3]" },
                            { name: "shieldKey", type: "bytes32" },
                        ],
                    },
                ],
            },
        ],
        outputs: [],
    },
];

const ZETACHAIN_ADAPT_ABI = [
    "function withdraw(bytes receiver, uint256 amount, address zrc20, address targetZrc20, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions) external",
];

/**
 * Execute Cross-Chain Shield (Deposit)
 * Sends funds from EVM chain (e.g. Sepolia) to Railgun on Zetachain via EVMAdapt.
 */
export const executeCrossChainShield = async (
    networkName: NetworkName,
    railgunAddress: string,
    evmAdaptAddress: string,
    tokenAddress: string,
    amount: bigint,
    signer: JsonRpcSigner | Wallet | HDNodeWallet,
    shouldUseNativeAsset: boolean = false
) => {
    // 1. Determine Token Type & Value
    const isNativePay = tokenAddress === ZeroAddress || shouldUseNativeAsset;
    let valueToSend = 0n;

    // If Native Token (ZeroAddress), we must specify the corresponding ZRC20 address in the Shield Request.
    // NOTE: The caller must ensure tokenAddress is correct. If it's ZeroAddress, the caller should pass the ZRC20 address?
    // In the frontend code, it hardcoded CONFIG.CONTRACTS.TEST_ERC20.
    // Here we should probably require the caller to pass the correct "Shield Token Address" (ZRC20) if it's different from "Payment Token Address".
    // For simplicity, we assume tokenAddress is the ZRC20 address unless it's ZeroAddress.
    // If it is ZeroAddress, we can't guess the ZRC20 address.
    // Let's change the signature to accept `shieldTokenAddress` explicitly if needed.
    // But to keep it simple and compatible with the frontend logic which seemed to handle "ETH -> ZRC20" mapping:
    // The frontend logic was: const shieldTokenAddress = (tokenAddress === ZeroAddress) ? CONFIG.CONTRACTS.TEST_ERC20 : tokenAddress;
    // We will assume the caller passes the correct ZRC20 address as `tokenAddress` if they want to shield that token.
    // If they want to pay with ETH but shield as ZRC20, they should pass `shouldUseNativeAsset=true` and `tokenAddress=ZRC20_ADDRESS`.
    
    const shieldTokenAddress = tokenAddress;

    if (isNativePay) {
        valueToSend = amount;
    } else {
        // ERC20 Approve Logic
        const erc20: any = new Contract(tokenAddress, ERC20_ABI, signer);
        const ownerAddress = await signer.getAddress();
        const currentAllowance = await erc20.allowance(ownerAddress, evmAdaptAddress);

        if (currentAllowance < amount) {
            console.log(`Approving token: ${tokenAddress}...`);
            const approveTx = await erc20.approve(evmAdaptAddress, amount);
            await approveTx.wait();
        }
        valueToSend = 0n;
    }

    // 2. Generate Shield Request
    // We need a random string for the shield request.
    const random = ByteUtils.randomHex(16);
    
    // We need the shield private key.
    // In SDK shield.ts we used getShieldSignature.
    // But generateERC20ShieldRequests in utils/transaction.ts takes shieldPrivateKey.
    // We need to get it first.
    // @ts-ignore
    const shieldPrivateKey = await getShieldSignature(signer);

    const shieldRequestStruct = await generateERC20ShieldRequests(
        {
            tokenAddress: shieldTokenAddress,
            amount,
            recipientAddress: railgunAddress,
        },
        random,
        shieldPrivateKey
    );

    // 3. Call EVMAdapt
    const evmAdapt: any = new Contract(evmAdaptAddress, EVM_ADAPT_ABI, signer);
    const tx = await evmAdapt.shieldOnZetachain([shieldRequestStruct], { value: valueToSend });
    return tx;
};

import { ByteUtils } from "@railgun-community/engine";
import { getShieldSignature } from "./utils/transaction";

/**
 * Execute Cross-Chain Transfer (Withdraw)
 * Unshields funds on Zetachain and calls ZetachainAdapt to bridge them to another chain.
 */
export const executeCrossChainTransfer = async (
    networkName: NetworkName,
    zetachainAdaptAddress: string,
    walletId: string,
    encryptionKey: string,
    amount: bigint,
    tokenAddress: string, // The token to unshield (ZRC20 on Zetachain)
    targetZrc20Address: string, // The gas token on Zetachain for the target chain
    receiverAddress: string, // The receiver address on the target chain (0x...)
    signer: JsonRpcSigner | Wallet | HDNodeWallet
) => {
    const sendWithPublicWallet = true; // Self-signing

    // 1. Prepare Unshield Amount
    const erc20AmountUnshieldAmounts: RailgunERC20Amount[] = [
        serializeERC20RelayAdaptUnshield(tokenAddress, amount),
    ];

    // 2. Construct Cross-Contract Call (Withdraw)
    const zetachainAdapt = new Contract(zetachainAdaptAddress, ZETACHAIN_ADAPT_ABI);
    
    // Encode receiver address to bytes
    const receiverBytes = receiverAddress; // Ethers handles hex string as bytes if prefixed with 0x? 
    // The frontend used: const receiverBytes = receiverAddress; 
    // But `withdraw` takes `bytes`. If receiverAddress is "0x123...", it should be fine.

    const revertOptions = {
        revertAddress: await signer.getAddress(),
        callOnRevert: false,
        abortAddress: ZeroAddress,
        revertMessage: "0x",
        onRevertGasLimit: 0n,
    };

    const callData = zetachainAdapt.interface.encodeFunctionData("withdraw", [
        receiverBytes,
        amount,
        tokenAddress,
        targetZrc20Address,
        revertOptions
    ]);

    const crossContractCalls: ContractTransaction[] = [
        {
            to: zetachainAdaptAddress,
            data: callData,
            value: 0n,
        },
    ];

    // 3. Estimate Gas
    const originalGasDetails = await getOriginalGasDetailsForTransaction(
        networkName,
        sendWithPublicWallet,
        signer
    );

    const { gasEstimate } = await gasEstimateForUnprovenCrossContractCalls(
        TXIDVersion.V2_PoseidonMerkle,
        networkName,
        walletId,
        encryptionKey,
        erc20AmountUnshieldAmounts,
        [], // nft unshield
        [], // erc20 shield
        [], // nft shield
        crossContractCalls,
        originalGasDetails,
        undefined, // feeTokenDetails
        sendWithPublicWallet,
        undefined, // minGasLimit
    );

    // 4. Prepare Gas Details
    const transactionGasDetails = await getGasDetailsForTransaction(
        networkName,
        gasEstimate,
        sendWithPublicWallet,
        signer
    );
    const overallBatchMinGasPrice = calculateGasPrice(transactionGasDetails);

    // 5. Generate Proof
    await generateCrossContractCallsProof(
        TXIDVersion.V2_PoseidonMerkle,
        networkName,
        walletId,
        encryptionKey,
        erc20AmountUnshieldAmounts,
        [], // nft unshield
        [], // erc20 shield
        [], // nft shield
        crossContractCalls,
        undefined, // relayerFee
        sendWithPublicWallet,
        overallBatchMinGasPrice,
        undefined, // minGasLimit
        () => { } // progressCallback
    );

    // 6. Populate Transaction
    const transaction = await populateProvedCrossContractCalls(
        TXIDVersion.V2_PoseidonMerkle,
        networkName,
        walletId,
        erc20AmountUnshieldAmounts,
        [], // nft unshield
        [], // erc20 shield
        [], // nft shield
        crossContractCalls,
        undefined, // relayerFee
        sendWithPublicWallet,
        overallBatchMinGasPrice,
        transactionGasDetails
    );

    // 7. Send Transaction
    const tx = await signer.sendTransaction(transaction.transaction);
    return tx;
};
