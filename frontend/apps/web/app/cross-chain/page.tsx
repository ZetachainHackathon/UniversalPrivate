"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseUnits, isAddress, formatEther, ZeroAddress, Contract } from "ethers";
import { loadPrivateWallet } from "@/lib/railgun/wallet-actions";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";
import { useLiveBalance } from "@/hooks/use-live-balance";
import { useNetworkSync } from "@/hooks/use-network-sync";
import { useRailgunAutoScan } from "@/hooks/use-railgun-auto-scan";
import { useShieldTransaction } from "@/hooks/use-shield-tx";
import { useTransferTransaction } from "@/hooks/use-transfer-tx";
import { useLiquidityTransaction } from "@/hooks/use-liquidity-tx";
import { CrossChainHeader } from "@/components/cross-chain/header";
import { ShieldForm } from "@/components/cross-chain/shield-form";
import { TransferForm } from "@/components/cross-chain/transfer-form";
import { UnshieldForm } from "@/components/cross-chain/unshield-form";
import { LiquidityForm } from "@/components/cross-chain/liquidity-form";
import { Button } from "@repo/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { CONFIG } from "@/config/env";

// 預設值 (Sepolia)
const DEFAULT_ADAPT_ADDRESS = CONFIG.CHAINS.SEPOLIA.EVM_ADAPT;
const DEFAULT_TOKEN_ADDRESS = ZeroAddress; // 預設使用原生代幣 (ETH)

export default function CrossChainPage() {
  // 從 Context 取得 signer 和 address
  const { isConnected, signer, address, checkNetwork, connectWallet, switchNetwork } = useWallet();
  const { balances, scanProgress, walletInfo, refresh } = useRailgun();

  // State
  // const [password, setPassword] = useState(""); // Removed: Moved to Header
  // const [railgunAddress, setRailgunAddress] = useState(""); // Removed: Moved to Context
  // const [walletId, setWalletId] = useState(""); // Removed: Moved to Context

  const railgunAddress = walletInfo?.railgunAddress || "";
  const walletId = walletInfo?.id || "";

  const [adaptAddress, setAdaptAddress] = useState(DEFAULT_ADAPT_ADDRESS);
  
  // Separate state for Shield and Transfer to prevent conflict
  const [shieldTokenAddress, setShieldTokenAddress] = useState(ZeroAddress); // Shield defaults to Native Token

  const [selectedChain, setSelectedChain] = useState("sepolia");

  // 根據 selectedChain 動態更新 adaptAddress
  useEffect(() => {
    const chainKey = selectedChain.toUpperCase().replace(/-/g, "_") as keyof typeof CONFIG.CHAINS;
    if (chainKey in CONFIG.CHAINS) {
      const chainConfig = CONFIG.CHAINS[chainKey];
      // 如果是 ZETACHAIN，不需要 EVM_ADAPT（使用 Local Shield）
      if (chainKey === "ZETACHAIN") {
        // ZetaChain 不需要 adaptAddress，但為了保持兼容性，可以設為空或保持不變
        // 實際上在 use-shield-tx.ts 中會檢查並使用 executeLocalShield
      } else if ("EVM_ADAPT" in chainConfig && chainConfig.EVM_ADAPT) {
        setAdaptAddress(chainConfig.EVM_ADAPT);
      }
    }
  }, [selectedChain]);
  const [amount, setAmount] = useState("0.01");
  const [recipient, setRecipient] = useState(""); // For Transfer
  const [unshieldRecipient, setUnshieldRecipient] = useState(""); // For Unshield
  const [targetChain, setTargetChain] = useState<string>("sepolia");
  
  // Separate token addresses for different forms
  const [transferTokenAddress, setTransferTokenAddress] = useState(DEFAULT_TOKEN_ADDRESS);
  const [unshieldTokenAddress, setUnshieldTokenAddress] = useState(DEFAULT_TOKEN_ADDRESS);
  const [targetTokenAddress, setTargetTokenAddress] = useState<string>(""); // For Unshield target token


  // Hooks (Phase 2 Smart Hooks + Phase 3 Toast)
  const { executeShield, isLoading: isLoadingShield, txHash: txHashShield } = useShieldTransaction();
  const {
    executeTransfer,
    isLoading: isLoadingTransfer,
    txHash: txHashTransfer
  } = useTransferTransaction();
  const { executeAddLiquidity, executeRemoveLiquidity, isLoading: isLoadingLiquidity, isLoadingRemove: isLoadingLiquidityRemove, txHash: txHashLiquidity, txHashRemove: txHashLiquidityRemove } = useLiquidityTransaction();

  // 合併 txHash 以顯示 (簡單處理：顯示最新的那個)
  const txHash = txHashShield || txHashTransfer || txHashLiquidity || txHashLiquidityRemove;
  // Combine status for display
  const [scanStatus, setScanStatus] = useState("");
  const isLoading = isLoadingShield || isLoadingTransfer || isLoadingLiquidity || isLoadingLiquidityRemove;
  const status = scanStatus; // Only scanStatus remains as a direct status string

  // 1. 同步網路
  useNetworkSync(signer || undefined, selectedChain, setSelectedChain);

  // 2. 獲取當前鏈餘額 (For Shield Form - L1 Balance)
  const { balance: liveBalance } = useLiveBalance(signer || undefined, address || undefined, shieldTokenAddress, selectedChain);

  // 3. 自動掃描 Railgun 餘額
  useRailgunAutoScan(walletId);

  // 監聽 Railgun 餘額變動
  useEffect(() => {
    if (scanProgress < 1.0 && scanProgress > 0) {
      const newStatus = `🔄 同步中... ${(scanProgress * 100).toFixed(0)}%`;
      if (scanStatus !== newStatus) setScanStatus(newStatus);
    } else if (scanProgress === 1.0 && scanStatus.startsWith("🔄")) {
      setScanStatus("");
    }
  }, [scanProgress, scanStatus]);


  // 切換鏈
  const handleChainChange = async (chain: string) => {
    // 注意：不直接設定 selectedChain，而是等待 syncChain 根據錢包狀態自動更新
    // 這樣可以避免 UI 狀態與錢包實際狀態不一致導致的閃爍
    try {
      const chainKey = chain.toUpperCase().replace(/-/g, "_") as keyof typeof CONFIG.CHAINS;
      if (chainKey in CONFIG.CHAINS) {
        const chainConfig = CONFIG.CHAINS[chainKey];
        const isCorrect = await checkNetwork(BigInt(chainConfig.ID_DEC));
        if (!isCorrect) {
          await switchNetwork(chainConfig.ID_HEX);
        }
      }
    } catch (e) {
      console.error("切換網路失敗:", e);
    }
  };

  // 執行 Shield (入金)
  const handleShield = async () => {
    await executeShield({
      adaptAddress,
      tokenAddress: shieldTokenAddress,
      amount,
      selectedChain,
    });
  };

  // 執行 Transfer (轉帳) - 只處理隱私地址轉帳
  const handleTransfer = async () => {
    // 密碼已由 Context 自動管理
    await executeTransfer({
      recipient,
      amount,
      transferType: "internal",
      tokenAddress: transferTokenAddress,
    });
  };

  // 執行 Unshield (出金) - 跨鏈轉帳
  const handleUnshield = async () => {
    // 密碼已由 Context 自動管理
    await executeTransfer({
      recipient: unshieldRecipient,
      amount,
      transferType: "cross-chain",
      targetChain: targetChain,
      tokenAddress: unshieldTokenAddress,
      targetTokenAddress: targetTokenAddress,
    });
  };

  // 執行 Add Liquidity (增加流動性)
  // 注意：實際的執行邏輯在 LiquidityForm 內部，這裡只是傳遞函數引用
  const handleAddLiquidity = () => {
    // 這個函數將由 LiquidityForm 內部調用 executeAddLiquidity
    // 不需要在這裡實現，因為參數都在 LiquidityForm 內部
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <CrossChainHeader />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl border-2 border-black rounded-2xl p-8 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

          <Tabs defaultValue="shield" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8 border-2 border-black p-1 rounded-xl bg-gray-100 h-auto">
              <TabsTrigger
                value="shield"
                className="text-lg font-bold py-3 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg transition-all"
              >
                Shield Self (入金)
              </TabsTrigger>
              <TabsTrigger
                value="transfer"
                className="text-lg font-bold py-3 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg transition-all"
              >
                Transfer (轉帳)
              </TabsTrigger>
              <TabsTrigger
                value="unshield"
                className="text-lg font-bold py-3 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg transition-all"
              >
                Unshield (出金)
              </TabsTrigger>
              <TabsTrigger
                value="defi"
                className="text-lg font-bold py-3 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg transition-all"
              >
                DeFi (DeFi 操作)
              </TabsTrigger>
            </TabsList>

            {/* Shield Content */}
            <TabsContent value="shield" className="space-y-6">
              <ShieldForm
                selectedChain={selectedChain}
                handleChainChange={handleChainChange}
                tokenAddress={shieldTokenAddress}
                setTokenAddress={setShieldTokenAddress}
                amount={amount}
                setAmount={setAmount}
                liveBalance={liveBalance}
                handleShield={handleShield}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* Transfer Content */}
            <TabsContent value="transfer" className="space-y-6">
              <TransferForm
                recipient={recipient}
                setRecipient={setRecipient}
                amount={amount}
                setAmount={setAmount}
                tokenAddress={transferTokenAddress}
                setTokenAddress={setTransferTokenAddress}
                railgunAddress={railgunAddress}
                balances={balances}
                handleTransfer={handleTransfer}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* Unshield Content */}
            <TabsContent value="unshield" className="space-y-6">
              <UnshieldForm
                recipient={unshieldRecipient}
                setRecipient={setUnshieldRecipient}
                amount={amount}
                setAmount={setAmount}
                tokenAddress={unshieldTokenAddress}
                setTokenAddress={setUnshieldTokenAddress}
                balances={balances}
                handleUnshield={handleUnshield}
                isLoading={isLoading}
                targetChain={targetChain}
                setTargetChain={setTargetChain}
                targetTokenAddress={targetTokenAddress}
                setTargetTokenAddress={setTargetTokenAddress}
              />
            </TabsContent>

            {/* DeFi Content */}
            <TabsContent value="defi" className="space-y-6">
              <LiquidityForm
                selectedChain={selectedChain}
                railgunAddress={railgunAddress}
                balances={balances}
                handleAddLiquidity={handleAddLiquidity}
                isLoading={isLoadingLiquidity}
                isLoadingRemove={isLoadingLiquidityRemove}
                executeAddLiquidity={executeAddLiquidity}
                executeRemoveLiquidity={executeRemoveLiquidity}
                onRefresh={refresh}
              />
            </TabsContent>
          </Tabs>

          {/* Status & Links */}
          {/* {status && ( // Removed: status UI block
            <div className="mt-8 p-4 bg-gray-100 border-2 border-black rounded-lg text-center font-bold">
              {status}
            </div>
          )} */}

          {txHash && (
            <div className="mt-4 text-center">
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-bold text-lg"
              >
                🔗 查看交易 (Etherscan)
              </a>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}