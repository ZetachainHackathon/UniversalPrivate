import {
    Contract,
    type JsonRpcSigner,
    type Wallet,
    ContractTransaction,
    ZeroAddress,
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

// EVM_ADAPT ABI
const EVM_ADAPT_ABI = [
    "function transactOnZetachain(bytes calldata _transactData) external",
];

// Contract Addresses
const RELAY_ADAPT = NETWORK_CONFIG[TEST_NETWORK].relayAdaptContract;

// Uniswap V2 Router ABI (簡化版，只包含 addLiquidity)
const UNISWAP_V2_ROUTER_ABI = [
    "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
    "function WETH() external pure returns (address)",
];


/**
 * 生成添加流動性的交易
 * 流程：
 * 1. 從 Railgun 隱私池 Unshield 兩個代幣
 * 2. 調用 Uniswap V2 Router 的 addLiquidity
 * 3. 可選：將 LP Token shield 回 Railgun
 */
export const generateAddLiquidityTransaction = async (
    walletId: string,
    tokenA: string,
    tokenB: string,
    amountA: bigint,
    amountB: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    password: string,
    signer: JsonRpcSigner | Wallet,
    uniswapRouterAddress?: string,
    shouldShieldLPToken: boolean = false,
    railgunAddress?: string
): Promise<{ transaction: any; to: string; data: string }> => {
    const encryptionKey = await getEncryptionKeyFromPassword(password);
    const engine = getEngine();

    // 0. Sync Engine
    await engine.scanContractHistory(NETWORK_CONFIG[TEST_NETWORK].chain, undefined);

    // 1. 獲取 Uniswap Router 地址（如果未提供，使用配置中的地址）
    // TODO: 從 CONFIG 中獲取 Uniswap Router 地址
    const routerAddress = uniswapRouterAddress || CONFIG.CHAINS.ZETACHAIN.ZETACHAIN_ADAPT; // 臨時使用，需要配置實際的 Router 地址
    
    if (!routerAddress) {
        throw new Error("Uniswap Router 地址未配置");
    }

    // 2. 準備 Unshield Amounts（從 Railgun 提取兩個代幣）
    const erc20AmountUnshieldAmounts: RailgunERC20Amount[] = [
        serializeERC20RelayAdaptUnshield(tokenA, amountA),
        serializeERC20RelayAdaptUnshield(tokenB, amountB),
    ];

    // 3. 構建 Uniswap addLiquidity 調用
    const router = new Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, signer.provider) as any;
    
    // 計算 deadline（當前時間 + 20 分鐘）
    const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
    
    // 構建 addLiquidity 調用
    // 注意：to 地址應該是 RelayAdapt，因為代幣會先轉到 RelayAdapt，然後由 RelayAdapt 調用 Router
    const addLiquidityData = await router.addLiquidity.populateTransaction(
        tokenA,
        tokenB,
        amountA,
        amountB,
        amountAMin, // 滑點保護：最小 amountA
        amountBMin, // 滑點保護：最小 amountB
        RELAY_ADAPT, // LP Token 接收地址（先發到 RelayAdapt）
        deadline
    );

    // 4. 準備 Cross-Contract Calls
    const crossContractCalls: ContractTransaction[] = [
        {
            to: addLiquidityData.to!,
            data: addLiquidityData.data!,
            value: 0n,
        },
    ];

    // 5. 可選：如果選擇將 LP Token shield 回 Railgun
    let erc20AmountShieldRecipients: RailgunERC20Recipient[] = [];
    if (shouldShieldLPToken && railgunAddress) {
        // TODO: 獲取 LP Token 地址（需要從 Uniswap Factory 獲取）
        // 這裡暫時留空，需要實作獲取 LP Token 地址的邏輯
        // const lpTokenAddress = await getLPTokenAddress(tokenA, tokenB, routerAddress);
        // erc20AmountShieldRecipients = [
        //     {
        //         tokenAddress: lpTokenAddress,
        //         recipientAddress: railgunAddress,
        //     },
        // ];
    }

    // 6. 估算 Gas
    const minGasLimit = CONFIG.GAS.MIN_LIMIT_CROSS_CHAIN || 500000n;
    const sendWithPublicWallet = true;

    const originalGasDetails = await getOriginalGasDetailsForTransaction(
        TEST_NETWORK,
        sendWithPublicWallet,
        signer
    );

    const { gasEstimate } = await gasEstimateForUnprovenCrossContractCalls(
        TXIDVersion.V2_PoseidonMerkle,
        TEST_NETWORK,
        walletId,
        encryptionKey,
        erc20AmountUnshieldAmounts,
        [], // erc721AmountUnshieldAmounts
        erc20AmountShieldRecipients,
        [], // erc721AmountShieldRecipients
        crossContractCalls,
        originalGasDetails,
        undefined, // feeTokenDetails
        sendWithPublicWallet,
        minGasLimit
    );

    // 7. 獲取 Gas Details & 計算價格
    const transactionGasDetails = await getGasDetailsForTransaction(
        TEST_NETWORK,
        gasEstimate,
        sendWithPublicWallet,
        signer
    );
    const overallBatchMinGasPrice = calculateGasPrice(transactionGasDetails);

    // 8. 生成 Proof
    await generateCrossContractCallsProof(
        TXIDVersion.V2_PoseidonMerkle,
        TEST_NETWORK,
        walletId,
        encryptionKey,
        erc20AmountUnshieldAmounts,
        [], // erc721AmountUnshieldAmounts
        erc20AmountShieldRecipients,
        [], // erc721AmountShieldRecipients
        crossContractCalls,
        undefined, // broadcasterFeeERC20AmountRecipient
        sendWithPublicWallet,
        overallBatchMinGasPrice,
        minGasLimit,
        () => {} // progressCallback
    );

    // 9. Populate Transaction
    const transaction = await populateProvedCrossContractCalls(
        TXIDVersion.V2_PoseidonMerkle,
        TEST_NETWORK,
        walletId,
        erc20AmountUnshieldAmounts,
        [], // erc721AmountUnshieldAmounts
        erc20AmountShieldRecipients,
        [], // erc721AmountShieldRecipients
        crossContractCalls,
        undefined, // broadcasterFeeERC20AmountRecipient
        sendWithPublicWallet,
        overallBatchMinGasPrice,
        transactionGasDetails
    );

    return {
        transaction: transaction.transaction,
        to: transaction.transaction.to,
        data: transaction.transaction.data,
    };
};

/**
 * 執行添加流動性（在 ZetaChain 上直接執行）
 */
export const executeAddLiquidity = async (
    walletId: string,
    tokenA: string,
    tokenB: string,
    amountA: bigint,
    amountB: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    password: string,
    signer: JsonRpcSigner | Wallet,
    uniswapRouterAddress?: string,
    shouldShieldLPToken: boolean = false,
    railgunAddress?: string
) => {
    const { transaction } = await generateAddLiquidityTransaction(
        walletId,
        tokenA,
        tokenB,
        amountA,
        amountB,
        amountAMin,
        amountBMin,
        password,
        signer,
        uniswapRouterAddress,
        shouldShieldLPToken,
        railgunAddress
    );

    const tx = await signer.sendTransaction(transaction);
    return tx;
};

/**
 * 從 EVM 鏈執行添加流動性（透過 EVMAdapt 轉送到 ZetaChain）
 */
export const executeAddLiquidityFromEvm = async (
    walletId: string,
    tokenA: string,
    tokenB: string,
    amountA: bigint,
    amountB: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    password: string,
    signer: JsonRpcSigner | Wallet,
    sourceChain: string,
    uniswapRouterAddress?: string,
    shouldShieldLPToken: boolean = false,
    railgunAddress?: string
) => {
    // 1) 產生在 Zetachain 上執行的添加流動性交易資料
    const { data } = await generateAddLiquidityTransaction(
        walletId,
        tokenA,
        tokenB,
        amountA,
        amountB,
        amountAMin,
        amountBMin,
        password,
        signer,
        uniswapRouterAddress,
        shouldShieldLPToken,
        railgunAddress
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

    // 3) 透過來源鏈的 EVMAdapt 將 transactData 轉送到 Zetachain
    const evmAdaptContract = new Contract(
        evmAdaptAddress,
        EVM_ADAPT_ABI,
        signer
    );
    const tx = await evmAdaptContract.transactOnZetachain!(data);
    return tx;
};

