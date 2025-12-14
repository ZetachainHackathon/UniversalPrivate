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
import { CrossChainHeader } from "@/components/cross-chain/header";
import { ShieldForm } from "@/components/cross-chain/shield-form";
import { TransferForm } from "@/components/cross-chain/transfer-form";
import { Button } from "@repo/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { CONFIG } from "@/config/env";

// 預設值 (Sepolia)
const DEFAULT_ADAPT_ADDRESS = CONFIG.CONTRACTS.DEFAULT_ADAPT;
const DEFAULT_TOKEN_ADDRESS = ZeroAddress; // 預設使用原生代幣 (ETH)

export default function CrossChainPage() {
  // 從 Context 取得 signer 和 address
  const { isConnected, signer, address, checkNetwork, connectWallet, switchNetwork } = useWallet();
  const { balances, scanProgress, reset, isReady } = useRailgun();

  // State
  const [password, setPassword] = useState("");
  const [railgunAddress, setRailgunAddress] = useState("");
  const [walletId, setWalletId] = useState(""); // 新增 walletId state
  const [adaptAddress, setAdaptAddress] = useState(DEFAULT_ADAPT_ADDRESS);
  const [tokenAddress, setTokenAddress] = useState(DEFAULT_TOKEN_ADDRESS);
  const [selectedChain, setSelectedChain] = useState("sepolia");
  const [amount, setAmount] = useState("0.01");
  const [recipient, setRecipient] = useState(""); // For Transfer
  const [transferType, setTransferType] = useState<"internal" | "cross-chain">("internal");


  // Transaction Hooks
  const { executeShield, isLoading: isShieldLoading, status: shieldStatus, txHash: shieldTxHash } = useShieldTransaction();
  const { executeTransfer, isLoading: isTransferLoading, status: transferStatus, txHash: transferTxHash } = useTransferTransaction();

  // Combine status for display
  const [scanStatus, setScanStatus] = useState("");
  const isLoading = isShieldLoading || isTransferLoading;
  const status = shieldStatus || transferStatus || scanStatus;
  const txHash = shieldTxHash || transferTxHash;
  // const [liveBalance, setLiveBalance] = useState("0"); // Replaced by hook
  // 1. 同步網路
  useNetworkSync(signer || undefined, selectedChain, setSelectedChain);

  // 2. 獲取當前鏈餘額
  const { balance: liveBalance } = useLiveBalance(signer || undefined, address || undefined, tokenAddress, selectedChain);

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
      if (chain === "sepolia") {
        const isSepolia = await checkNetwork(BigInt(CONFIG.CHAINS.SEPOLIA.ID_DEC));
        if (!isSepolia) await switchNetwork(CONFIG.CHAINS.SEPOLIA.ID_HEX);
      } else if (chain === "zetachain") {
        const isZeta = await checkNetwork(BigInt(CONFIG.CHAINS.ZETACHAIN.ID_DEC));
        if (!isZeta) await switchNetwork(CONFIG.CHAINS.ZETACHAIN.ID_HEX);
      }
    } catch (e) {
      console.error("切換網路失敗:", e);
    }
  };

  // 載入錢包資訊
  const handleLoadWallet = async () => {
    if (!password) return alert("請輸入密碼");
    try {
      // 1. 先重置餘額狀態，避免顯示上一個錢包的餘額
      reset();

      const walletInfo = await loadPrivateWallet(password);
      setRailgunAddress(walletInfo.railgunAddress);
      setWalletId(walletInfo.id);

      setWalletId(walletInfo.id);

      // 2. 觸發餘額掃描 (這裡需要保留手動觸發，確保 UI 立即回應)
      const { triggerBalanceRefresh } = await import("@/lib/railgun/balance");
      await triggerBalanceRefresh(walletInfo.id);
    } catch (e: any) {
      alert("載入失敗: " + e.message);
    }
  };


  // 複製功能
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} 已複製！`);
  };

  // 清除快取 (Hard Reset)
  const handleHardReset = async () => {
    if (!confirm("⚠️ 警告：這將清除應用程式的本地資料庫並重新整理頁面。\n\n如果你的錢包餘額顯示不正確，這通常可以解決問題。確定要繼續嗎？")) {
      return;
    }

    try {
      const { clearRailgunStorage } = await import("@/lib/railgun/balance");
      await clearRailgunStorage();
      alert("✅ 快取已清除！即將重新整理...");
      window.location.reload();
    } catch (e: any) {
      alert("❌ 清除失敗: " + e.message);
    }
  };

  // 執行 Shield (入金)
  const handleShield = async () => {
    await executeShield({
      railgunAddress,
      adaptAddress,
      tokenAddress,
      amount,
      selectedChain,
      signer: signer || undefined,
      isConnected,
      connectWallet,
      checkNetwork,
      switchNetwork,
      walletId
    });
  };

  // 執行 Transfer (轉帳)
  const handleTransfer = async () => {
    await executeTransfer({
      railgunAddress,
      walletId,
      recipient,
      amount,
      transferType,
      password,
      signer: signer || undefined,
      isConnected,
      connectWallet,
      checkNetwork,
      switchNetwork
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <CrossChainHeader
        railgunAddress={railgunAddress}
        password={password}
        setPassword={setPassword}
        handleLoadWallet={handleLoadWallet}
        isConnected={isConnected}
        address={address}
        connectWallet={connectWallet}
        handleHardReset={handleHardReset}
        isRailgunReady={isReady}
      />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl border-2 border-black rounded-2xl p-8 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

          <Tabs defaultValue="shield" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 border-2 border-black p-1 rounded-xl bg-gray-100 h-auto">
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
            </TabsList>

            {/* Shield Content */}
            <TabsContent value="shield" className="space-y-6">
              <ShieldForm
                selectedChain={selectedChain}
                handleChainChange={handleChainChange}
                tokenAddress={tokenAddress}
                setTokenAddress={setTokenAddress}
                amount={amount}
                setAmount={setAmount}
                liveBalance={liveBalance}
                handleShield={handleShield}
                isLoading={isLoading}
                status={status}
              />
            </TabsContent>

            {/* Transfer Content */}
            <TabsContent value="transfer" className="space-y-6">
              <TransferForm
                transferType={transferType}
                setTransferType={setTransferType}
                recipient={recipient}
                setRecipient={setRecipient}
                amount={amount}
                setAmount={setAmount}
                tokenAddress={tokenAddress}
                railgunAddress={railgunAddress}
                balances={balances}
                handleTransfer={handleTransfer}
                isLoading={isLoading}
                status={status}
              />
            </TabsContent>
          </Tabs>

          {/* Status & Links */}
          {status && (
            <div className="mt-8 p-4 bg-gray-100 border-2 border-black rounded-lg text-center font-bold">
              {status}
            </div>
          )}

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