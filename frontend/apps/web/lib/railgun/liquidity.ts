import {
    Contract,
    type JsonRpcSigner,
    type Wallet,
    ContractTransaction,
    ZeroAddress,
    JsonRpcProvider,
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
import { getPairAddress } from "./uniswap-pools";
import { TEST_NETWORK } from "@/constants";
import { CONFIG } from "@/config/env";

// EVM_ADAPT ABI
const EVM_ADAPT_ABI = [
    "function transactOnZetachain(bytes calldata _transactData) external",
];

// Contract Addresses
const RELAY_ADAPT = NETWORK_CONFIG[TEST_NETWORK].relayAdaptContract;

// Uniswap V2 Router ABI (包含 addLiquidity 和 removeLiquidity)
// 根據 Uniswap V2 Router02 官方 ABI
const UNISWAP_V2_ROUTER_ABI = [
    "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
    "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB)",
    "function WETH() external pure returns (address)",
] as const;

// ERC20 ABI for Approve
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
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
    shouldShieldLPToken: boolean = false,
    railgunAddress?: string
): Promise<{ transaction: any; to: string; data: string }> => {
    const encryptionKey = await getEncryptionKeyFromPassword(password);
    const engine = getEngine();

    // 0. Sync Engine
    await engine.scanContractHistory(NETWORK_CONFIG[TEST_NETWORK].chain, undefined);

    // 1. 獲取 Uniswap Router 地址（如果未提供，使用配置中的地址）
    const routerAddress = CONFIG.RAILGUN_NETWORK.UniswapV2Router;
    
    if (!routerAddress) {
        throw new Error("Uniswap Router 地址未配置");
    }

    const unshieldFeeBasisPoints = CONFIG.FEES.UNSHIELD_BASIS_POINTS;
    const amountAAfterFee = (amountA * (10000n - unshieldFeeBasisPoints)) / 10000n;
    const amountBAfterFee = (amountB * (10000n - unshieldFeeBasisPoints)) / 10000n;

    

    // 2. 準備 Unshield Amounts（從 Railgun 提取兩個代幣）
    const erc20AmountUnshieldAmounts: RailgunERC20Amount[] = [
        serializeERC20RelayAdaptUnshield(tokenA, amountA),
        serializeERC20RelayAdaptUnshield(tokenB, amountB),
    ];

    // 3. 構建 Approve 和 Uniswap addLiquidity 調用
    // 重要：所有合約查詢都必須使用 ZetaChain 的 provider，因為 Router、Token 和 LP Token 都在 ZetaChain 上
    const zetachainProvider = new JsonRpcProvider(CONFIG.RAILGUN_NETWORK.RPC_URL);
    const router = new Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, zetachainProvider) as any;
    
    // 計算 deadline（當前時間 + 20 分鐘）
    const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
    
    
    // 3.2. 構建 Approve 調用（RelayAdapt 需要先 Approve 代幣給 Uniswap Router）
    // 重要：Approve 時必須使用 finalTokenA 和 finalTokenB（排序後的），
    // 因為 addLiquidity 使用的是排序後的順序，Router 會從 RelayAdapt 轉移 finalTokenA 和 finalTokenB
    const finalTokenAContract = new Contract(tokenA, ERC20_ABI, zetachainProvider) as any;
    const finalTokenBContract = new Contract(tokenB, ERC20_ABI, zetachainProvider) as any;
    
    // 先將 Approve 設為 0（某些 ERC20 代幣要求，符合 ERC20 標準）
    // 然後再設置為實際金額
    const approveTokenAData = await finalTokenAContract.approve.populateTransaction(routerAddress, amountAAfterFee);
    const approveTokenBData = await finalTokenBContract.approve.populateTransaction(routerAddress, amountBAfterFee);
    
    // 3.3. 構建 addLiquidity 調用
    // 注意：to 地址應該是 Router，因為 RelayAdapt 會調用 Router
    // 使用扣除手續費後的金額和重新計算的最小金額
    const addLiquidityData = await router.addLiquidity.populateTransaction(
        tokenA,
        tokenB,
        amountAAfterFee,
        amountBAfterFee,
        0, // 滑點保護：基於扣除手續費後的金額計算的最小 amountA
        0, // 滑點保護：基於扣除手續費後的金額計算的最小 amountB
        RELAY_ADAPT, // LP Token 接收地址（先發到 RelayAdapt）
        deadline
    );

    // 4. 準備 Cross-Contract Calls（順序很重要：先 Approve 0，再 Approve 實際金額，最後 addLiquidity）
    // 重要：必須使用 finalTokenA 和 finalTokenB（排序後的），與 addLiquidity 保持一致
    const crossContractCalls: ContractTransaction[] = [
        // 授權 finalTokenA 給 Router
        {
            to: tokenA,
            data: approveTokenAData.data!,
            value: 0n,
        },
        // 授權 finalTokenB 給 Router
        {
            to: tokenB,
            data: approveTokenBData.data!,
            value: 0n,
        },
        // 最後調用 addLiquidity
        {
            to: addLiquidityData.to!,
            data: addLiquidityData.data!,
            value: 0n,
        },
    ];

        // 5. 可選：如果選擇將 LP Token shield 回 Railgun
        let erc20AmountShieldRecipients: RailgunERC20Recipient[] = [];
        if (shouldShieldLPToken && railgunAddress) {
            // 獲取 LP Token 地址（在 Uniswap V2 中，Pair 合約地址就是 LP Token 地址）
            // 重要：必須使用 ZetaChain 的 provider 查詢池子地址（重複使用上面創建的 provider）
            const lpTokenAddress = await getPairAddress(tokenA, tokenB, zetachainProvider);
            
            // 檢查池子是否存在
            if (lpTokenAddress === ZeroAddress) {
                throw new Error(`池子不存在：${tokenA} / ${tokenB}`);
            }
            
            erc20AmountShieldRecipients = [
                {
                    tokenAddress: lpTokenAddress,
                    recipientAddress: railgunAddress,
                },
            ];
        }

    // 6. 估算 Gas
    // 注意：對於複雜的 multicall（如添加流動性），需要足夠的 Gas Limit
    // 因為需要執行 Unshield、Approve 和 addLiquidity 多個步驟
    const minGasLimit = 2_000_000n; // 增加到 2M 以確保足夠
    const sendWithPublicWallet = true;

    const originalGasDetails = await getOriginalGasDetailsForTransaction(
        TEST_NETWORK,
        sendWithPublicWallet,
        signer
    );

    // 嘗試 Gas 估算
    // 注意：在 Gas 估算的模擬執行中，Railgun SDK 可能無法正確模擬 Unshield 後的代幣餘額
    // 如果 Gas 估算失敗，我們使用一個固定的 Gas Limit
    let gasEstimate: bigint;
    try {
        const estimateResult = await gasEstimateForUnprovenCrossContractCalls(
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
        gasEstimate = estimateResult.gasEstimate;
    } catch (error: any) {
        // 如果 Gas 估算失敗（例如在模擬執行中無法正確模擬 Unshield），
        // 使用一個固定的 Gas Limit
        // 這個值應該足夠執行 Unshield、Approve 和 addLiquidity
        console.warn("Gas estimation failed, using fixed gas limit:", error.message);
        gasEstimate = 3_000_000n; // 使用 3M 作為固定 Gas Limit
    }

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
    console.log("🚀 generateAddLiquidityTransaction transaction:", transaction);
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
        shouldShieldLPToken,
        railgunAddress
    );

    console.log("🚀 executeAddLiquidityFromEvm data:", data);

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
    const tx = await evmAdaptContract.transactOnZetachain!(data, { gasLimit: 1000000n });
    return tx;
};

/**
 * 生成移除流動性的交易
 * 流程：
 * 1. 從 Railgun 隱私池 Unshield LP Token
 * 2. 調用 Uniswap V2 Router 的 removeLiquidity
 * 3. 可選：將兩個代幣 shield 回 Railgun
 */
export const generateRemoveLiquidityTransaction = async (
    walletId: string,
    tokenA: string,
    tokenB: string,
    liquidity: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    password: string,
    signer: JsonRpcSigner | Wallet,
    shouldShieldTokens: boolean = false,
    railgunAddress?: string
): Promise<{ transaction: any; to: string; data: string }> => {
    const encryptionKey = await getEncryptionKeyFromPassword(password);
    const engine = getEngine();

    // 0. Sync Engine
    await engine.scanContractHistory(NETWORK_CONFIG[TEST_NETWORK].chain, undefined);

    // 1. 獲取 Uniswap Router 地址
    const routerAddress = CONFIG.RAILGUN_NETWORK.UniswapV2Router;
    
    if (!routerAddress) {
        throw new Error("Uniswap Router 地址未配置");
    }

    // 2. 獲取 LP Token 地址
    // 重要：必須使用 ZetaChain 的 provider 查詢池子地址，因為所有池子都在 ZetaChain 上
    const zetachainProvider = new JsonRpcProvider(CONFIG.RAILGUN_NETWORK.RPC_URL);
    const lpTokenAddress = await getPairAddress(tokenA, tokenB, zetachainProvider);
    
    // 檢查池子是否存在
    if (lpTokenAddress === ZeroAddress) {
        throw new Error(`池子不存在：${tokenA} / ${tokenB}`);
    }

    const unshieldFeeBasisPoints = CONFIG.FEES.UNSHIELD_BASIS_POINTS;
    const liquidityAfterFee = (liquidity * (10000n - unshieldFeeBasisPoints)) / 10000n;

    // 3. 準備 Unshield Amounts（從 Railgun 提取 LP Token）
    const erc20AmountUnshieldAmounts: RailgunERC20Amount[] = [
        serializeERC20RelayAdaptUnshield(lpTokenAddress, liquidity),
    ];

    // 4. 構建 Approve 和 Uniswap removeLiquidity 調用
    // 重要：所有合約查詢都必須使用 ZetaChain 的 provider
    const router = new Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, zetachainProvider) as any;
    
    // 計算 deadline（當前時間 + 20 分鐘）
    const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
    
    // 4.1. 構建 Approve 調用（RelayAdapt 需要先 Approve LP Token 給 Uniswap Router）
    const lpTokenContract = new Contract(lpTokenAddress, ERC20_ABI, zetachainProvider) as any;
    const approveLPTokenData = await lpTokenContract.approve.populateTransaction(routerAddress, liquidityAfterFee);
   
    
    // 重新計算最小金額，基於扣除手續費後的 LP Token
    // 保持相同的比例：amountAMinAfterFee / liquidityAfterFee = amountAMin / liquidity
    const amountAMinAfterFee = liquidity > 0n
        ? (amountAMin * liquidityAfterFee) / liquidity
        : 0n;
    const amountBMinAfterFee = liquidity > 0n
        ? (amountBMin * liquidityAfterFee) / liquidity
        : 0n;
    
    const removeLiquidityData = await router.removeLiquidity.populateTransaction(
        tokenA,
        tokenB,
        liquidityAfterFee,
        amountAMinAfterFee, // 滑點保護：基於扣除手續費後的金額計算的最小 amountA
        amountBMinAfterFee, // 滑點保護：基於扣除手續費後的金額計算的最小 amountB
        RELAY_ADAPT, // 代幣接收地址（先發到 RelayAdapt）
        deadline
    );

    // 5. 準備 Cross-Contract Calls
    const crossContractCalls: ContractTransaction[] = [
        // 授權 LP Token 給 Router
        {
            to: lpTokenAddress,
            data: approveLPTokenData.data!,
            value: 0n,
        },
        // 調用 removeLiquidity
        {
            to: removeLiquidityData.to!,
            data: removeLiquidityData.data!,
            value: 0n,
        },
    ];

    // 6. 可選：如果選擇將兩個代幣 shield 回 Railgun
    let erc20AmountShieldRecipients: RailgunERC20Recipient[] = [];
    if (shouldShieldTokens && railgunAddress) {
        console.log("🛡️ 準備 Shield 代幣回 Railgun:", {
            tokenA: tokenA,
            tokenB: tokenB,
            railgunAddress,
        });
        
        erc20AmountShieldRecipients = [
            {
                tokenAddress: tokenA,
                recipientAddress: railgunAddress,
            },
            {
                tokenAddress: tokenB,
                recipientAddress: railgunAddress,
            },
        ];
    }

    // 7. 估算 Gas
    const minGasLimit = 2_000_000n;
    const sendWithPublicWallet = true;

    const originalGasDetails = await getOriginalGasDetailsForTransaction(
        TEST_NETWORK,
        sendWithPublicWallet,
        signer
    );

    // 嘗試 Gas 估算
    let gasEstimate: bigint;
    try {
        const estimateResult = await gasEstimateForUnprovenCrossContractCalls(
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
        gasEstimate = estimateResult.gasEstimate;
    } catch (error: any) {
        console.warn("Gas estimation failed, using fixed gas limit:", error.message);
        gasEstimate = 3_000_000n;
    }

    // 8. 獲取 Gas Details & 計算價格
    const transactionGasDetails = await getGasDetailsForTransaction(
        TEST_NETWORK,
        gasEstimate,
        sendWithPublicWallet,
        signer
    );
    const overallBatchMinGasPrice = calculateGasPrice(transactionGasDetails);

    // 9. 生成 Proof
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

    // 10. Populate Transaction
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
 * 執行移除流動性（在 ZetaChain 上直接執行）
 */
export const executeRemoveLiquidity = async (
    walletId: string,
    tokenA: string,
    tokenB: string,
    liquidity: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    password: string,
    signer: JsonRpcSigner | Wallet,
    shouldShieldTokens: boolean = false,
    railgunAddress?: string
) => {
    const { transaction } = await generateRemoveLiquidityTransaction(
        walletId,
        tokenA,
        tokenB,
        liquidity,
        amountAMin,
        amountBMin,
        password,
        signer,
        shouldShieldTokens,
        railgunAddress
    );

    const tx = await signer.sendTransaction(transaction);
    return tx;
};

/**
 * 從 EVM 鏈執行移除流動性（透過 EVMAdapt 轉送到 ZetaChain）
 */
export const executeRemoveLiquidityFromEvm = async (
    walletId: string,
    tokenA: string,
    tokenB: string,
    liquidity: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    password: string,
    signer: JsonRpcSigner | Wallet,
    sourceChain: string,
    shouldShieldTokens: boolean = true,
    railgunAddress?: string
) => {
    // 1) 產生在 Zetachain 上執行的移除流動性交易資料
    const { data } = await generateRemoveLiquidityTransaction(
        walletId,
        tokenA,
        tokenB,
        liquidity,
        amountAMin,
        amountBMin,
        password,
        signer,
        shouldShieldTokens,
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

