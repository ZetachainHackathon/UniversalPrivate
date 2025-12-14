"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseUnits, isAddress, formatEther, ZeroAddress, Contract } from "ethers"; 
import { executeCrossChainShield } from "@/lib/railgun/cross-chain-shield";
import { executeCrossChainTransfer } from "@/lib/railgun/cross-chain-transfer";
import { executeLocalShield } from "@/lib/railgun/shield";
import { loadPrivateWallet } from "@/lib/railgun/wallet-actions";
import { triggerBalanceRefresh } from "@/lib/railgun/balance";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";
import { Button } from "@repo/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { TEST_NETWORK } from "@/constants";
import { NETWORK_CONFIG, NetworkName } from "@railgun-community/shared-models";

// 預設值 (Sepolia)
const DEFAULT_ADAPT_ADDRESS = "0xc32AfcB92B92886ca08d288280127d5F1A535AaF"; 
const DEFAULT_TOKEN_ADDRESS = ZeroAddress; // 預設使用原生代幣 (ETH)

const SEPOLIA_CHAIN_ID_DEC = 11155111n;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
const ZETA_CHAIN_ID_DEC = 7001n;
const ZETA_CHAIN_ID_HEX = "0x1b59";

export default function CrossChainPage() {
  // 從 Context 取得 signer 和 address
  const { isConnected, signer, address, checkNetwork, connectWallet, switchNetwork } = useWallet();
  const { balances, scanProgress, reset } = useRailgun();

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
  
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveBalance, setLiveBalance] = useState("0");
  // const [privateBalance, setPrivateBalance] = useState("0"); // 移除單一餘額狀態

  // 同步錢包網路狀態到 selectedChain
  useEffect(() => {
    const syncChain = async () => {
      if (signer && signer.provider) {
        try {
          const network = await signer.provider.getNetwork();
          const chainId = network.chainId;
          if (chainId === SEPOLIA_CHAIN_ID_DEC && selectedChain !== "sepolia") {
            setSelectedChain("sepolia");
          } else if (chainId === ZETA_CHAIN_ID_DEC && selectedChain !== "zetachain") {
            setSelectedChain("zetachain");
          }
        } catch (e: any) {
          // 忽略網路切換過程中的錯誤
          if (e.code !== 'NETWORK_ERROR') {
            console.error("Failed to sync chain:", e);
          }
        }
      }
    };
    syncChain();
  }, [signer, selectedChain]);

  // 監聽 Railgun 餘額變動
  useEffect(() => {
    if (scanProgress < 1.0 && scanProgress > 0) {
        const newStatus = `🔄 同步中... ${(scanProgress * 100).toFixed(0)}%`;
        if (status !== newStatus) setStatus(newStatus);
    } else if (scanProgress === 1.0 && status.startsWith("🔄")) {
        setStatus("");
    }
  }, [scanProgress, status]);

  // 監聽餘額
  useEffect(() => {
    const refreshBalance = async () => {
      if (signer && address) {
        try {
          let bal = 0n;
          if (tokenAddress === ZeroAddress) {
             bal = await signer.provider?.getBalance(address) ?? 0n;
          } else {
             // ERC20
             const contract = new Contract(tokenAddress, ["function balanceOf(address) view returns (uint256)"], signer) as any;
             bal = await contract.balanceOf(address);
          }
          setLiveBalance(formatEther(bal));
        } catch (e: any) { 
            // 忽略網路切換過程中的錯誤
            if (e.code !== 'NETWORK_ERROR') {
                console.error("無法讀取餘額:", e); 
                setLiveBalance("0");
            }
        }
      }
    };
    if (isConnected) refreshBalance();
  }, [signer, address, isConnected, tokenAddress, selectedChain]); // Add tokenAddress dependency

  // 切換鏈
  const handleChainChange = async (chain: string) => {
      // 注意：不直接設定 selectedChain，而是等待 syncChain 根據錢包狀態自動更新
      // 這樣可以避免 UI 狀態與錢包實際狀態不一致導致的閃爍
      try {
        if (chain === "sepolia") {
            const isSepolia = await checkNetwork(SEPOLIA_CHAIN_ID_DEC);
            if (!isSepolia) await switchNetwork(SEPOLIA_CHAIN_ID_HEX);
        } else if (chain === "zetachain") {
            const isZeta = await checkNetwork(ZETA_CHAIN_ID_DEC);
            if (!isZeta) await switchNetwork(ZETA_CHAIN_ID_HEX);
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
      
      // 2. 觸發餘額掃描
      await triggerBalanceRefresh(walletInfo.id);
    } catch (e: any) {
      alert("載入失敗: " + e.message);
    }
  };

  // 持續掃描餘額 (每 10 秒，避免重疊)
  useEffect(() => {
    if (!walletId) return;

    let isScanning = false;
    const interval = setInterval(async () => {
      if (isScanning) return;
      isScanning = true;
      try {
        console.log("wallet id : " , walletId);
        // console.log("⏰ 定時觸發餘額掃描...");
        await triggerBalanceRefresh(walletId);
      } catch (e) {
        console.error("掃描錯誤:", e);
      } finally {
        isScanning = false;
      }
    }, 10000); // 加速到 10 秒

    return () => clearInterval(interval);
  }, [walletId]);

  // 複製功能
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} 已複製！`);
  };

  // 執行 Shield (入金)
  const handleShield = async () => {
    if (!railgunAddress) return alert("請先解鎖 Railgun 錢包");
    if (!isAddress(adaptAddress)) return alert("合約地址格式錯誤");

    if (!isConnected || !signer) {
      try { await connectWallet(); return; } catch (e) { return alert("連接錢包失敗"); }
    }

    // 根據選擇的鏈進行檢查
    if (selectedChain === "sepolia") {
        const isSepolia = await checkNetwork(SEPOLIA_CHAIN_ID_DEC);
        if (!isSepolia) {
            if (confirm("切換至 Sepolia 網路？")) await switchNetwork(SEPOLIA_CHAIN_ID_HEX);
            return;
        }
    } else if (selectedChain === "zetachain") {
        const isZeta = await checkNetwork(ZETA_CHAIN_ID_DEC);
        if (!isZeta) {
            if (confirm("切換至 ZetaChain 網路？")) await switchNetwork(ZETA_CHAIN_ID_HEX);
            return;
        }
    }

    setIsLoading(true);
    setStatus("⏳ 正在準備 Shield 交易...");
    setTxHash("");

    try {
      const amountBigInt = parseUnits(amount, 18); 
      
      let tx;
      if (selectedChain === "sepolia") {
          // Sepolia -> ZetaChain (Cross-Chain Shield)
          // 強制使用 Native Token (ETH) 支付
          tx = await executeCrossChainShield(
            railgunAddress,
            adaptAddress,
            tokenAddress,
            amountBigInt,
            signer,
            true 
          );
      } else {
          // ZetaChain -> ZetaChain (Local Shield)
          // 注意：這裡假設 tokenAddress 是 ERC20。如果是 Native Token，可能需要先 Wrap。
          // 為了簡化，如果選擇 Native Token (ZeroAddress)，我們可能需要提示用戶或自動 Wrap。
          // 目前 executeLocalShield 支援 ERC20。
          
          let targetToken = tokenAddress;
          if (tokenAddress === ZeroAddress) {
              // 如果是 Native Token，需要使用 Wrapped Token 地址
              // 這裡假設 ZetaChain 的 WZETA 地址。需要確認。
              // 暫時使用 TEST_TOKEN 作為 fallback 或提示錯誤
              // alert("ZetaChain Native Token Shield 尚未完全支援，請使用 ERC20");
              // return;
              // 假設 TEST_TOKEN 是 WZETA
              // targetToken = "0x..."; 
          }

          tx = await executeLocalShield(
              railgunAddress,
              targetToken,
              amountBigInt,
              signer,
              TEST_NETWORK // ZetaChain Testnet
          );
      }

      setStatus("✅ 交易已送出！等待上鏈...");
      await tx.wait();
      setTxHash(tx.hash);
      setStatus("🎉 Shield 成功！");

      // 交易成功後，延遲 5 秒觸發一次掃描
      if (walletId) {
        setTimeout(() => {
            console.log("🔄 交易後觸發餘額更新...");
            triggerBalanceRefresh(walletId).catch(console.error);
        }, 5000);
      }
    } catch (error: any) {
      console.error(error);
      setStatus("❌ 交易失敗: " + (error.reason || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // 執行 Transfer (轉帳)
  const handleTransfer = async () => {
    if (!railgunAddress) return alert("請先解鎖 Railgun 錢包");
    if (!walletId) return alert("錢包 ID 遺失，請重新解鎖");
    if (!recipient) return alert("請輸入接收方地址");
    if (!amount) return alert("請輸入金額");

    if (transferType === "internal") {
        alert("轉帳給 0zk 地址功能開發中...");
        return;
    }

    if (transferType === "cross-chain") {
        if (!isConnected || !signer) {
            try { await connectWallet(); return; } catch (e) { return alert("連接錢包失敗"); }
        }

        // 檢查是否在 Sepolia (因為是從 Sepolia 出發)
        const isSepolia = await checkNetwork(SEPOLIA_CHAIN_ID_DEC);
        if (!isSepolia) {
            if (confirm("跨鏈轉帳需在 Sepolia 網路上發起，是否切換？")) await switchNetwork(SEPOLIA_CHAIN_ID_HEX);
            return;
        }

        setIsLoading(true);
        setStatus("⏳ 正在準備跨鏈轉帳 (Unshield)...");
        setTxHash("");

        try {
            const tx = await executeCrossChainTransfer(
                password, // 需要密碼來生成 Proof
                walletId,
                amount,
                recipient,
                signer
            );

            setStatus("✅ 交易已送出！等待上鏈...");
            await tx.wait();
            setTxHash(tx.hash);
            setStatus("🎉 跨鏈轉帳成功！");

            // 延遲更新餘額
            setTimeout(() => {
                triggerBalanceRefresh(walletId).catch(console.error);
            }, 5000);

        } catch (error: any) {
            console.error(error);
            setStatus("❌ 交易失敗: " + (error.reason || error.message));
        } finally {
            setIsLoading(false);
        }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button className="h-10 w-10 p-0 border-2 border-black bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-lg flex items-center justify-center text-xl font-bold">
              ←
            </Button>
          </Link>
          {railgunAddress ? (
            <div className="flex flex-col">
              <div className="flex items-center gap-2 border-2 border-black px-4 py-2 rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-bold text-sm">0zk: {railgunAddress.slice(0, 8)}...{railgunAddress.slice(-6)}</span>
                <button 
                  onClick={() => copyToClipboard(railgunAddress, "0zk Address")}
                  className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded border border-black"
                >
                  Copy
                </button>
              </div>
              <button 
                onClick={() => alert("請實作匯出助記詞功能")} // 這裡需要實作匯出邏輯
                className="text-xs text-gray-500 underline mt-1 ml-1 hover:text-black text-left"
              >
                Export Seed/助記詞
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input 
                type="password" 
                placeholder="輸入密碼解鎖 0zk" 
                className="border-2 border-black rounded px-2 py-1 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button onClick={handleLoadWallet} className="h-8 text-xs border-2 border-black bg-black text-white">
                解鎖
              </Button>
            </div>
          )}
        </div>

        <Button 
          onClick={connectWallet}
          className="bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          {isConnected && address 
            ? `${address.slice(0, 6)}...${address.slice(-4)}` 
            : "錢包 (Connect)"}
        </Button>
      </header>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-bold">選擇鏈 (Chain)</label>
                  <select 
                    className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium"
                    value={selectedChain}
                    onChange={(e) => handleChainChange(e.target.value)}
                  >
                    <option value="sepolia">Sepolia Testnet</option>
                    <option value="zetachain">ZetaChain Testnet</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="font-bold">代幣 (Token)</label>
                  <select 
                    className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium"
                    onChange={(e) => setTokenAddress(e.target.value)}
                    value={tokenAddress}
                  >
                    <option value={ZeroAddress}>Native Token ({selectedChain === "sepolia" ? "ETH" : "ZETA"})</option>
                    <option value="0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0">Test ERC20</option>
                  </select>
                  <p className="text-xs text-gray-500 font-mono break-all">
                    Addr: {tokenAddress}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold">金額 (Amount)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full p-4 border-2 border-black rounded-lg text-xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                    {tokenAddress === ZeroAddress ? (selectedChain === "sepolia" ? "ETH" : "ZETA") : "ERC20"}
                  </span>
                </div>
                <p className="text-sm text-gray-500 text-right">
                    錢包餘額: {Number(liveBalance).toFixed(4)} {tokenAddress === ZeroAddress ? (selectedChain === "sepolia" ? "ETH" : "ZETA") : "ERC20"}
                </p>
              </div>

              <Button 
                onClick={handleShield}
                disabled={isLoading}
                className="w-full py-6 text-xl font-bold bg-black text-white hover:bg-gray-800 border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all mt-4"
              >
                {isLoading ? status : "執行 Shield (入金)"}
              </Button>
            </TabsContent>

            {/* Transfer Content */}
            <TabsContent value="transfer" className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input 
                        type="radio" 
                        name="txType" 
                        className="w-5 h-5 accent-black" 
                        checked={transferType === "internal"}
                        onChange={() => setTransferType("internal")}
                    />
                    轉給隱私地址 (0zk)
                  </label>
                  <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input 
                        type="radio" 
                        name="txType" 
                        className="w-5 h-5 accent-black" 
                        checked={transferType === "cross-chain"}
                        onChange={() => setTransferType("cross-chain")}
                    />
                    跨鏈轉帳 (Cross-Chain)
                  </label>
                </div>

                {transferType === "cross-chain" && (
                    <div className="space-y-2 p-4 bg-gray-100 border-2 border-black rounded-lg">
                        <label className="font-bold">目標鏈 (Target Chain)</label>
                        <select className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium" disabled>
                            <option value="zetachain">ZetaChain Testnet</option>
                        </select>
                        <p className="text-xs text-gray-500">目前僅支援 Sepolia -&gt; ZetaChain</p>
                    </div>
                )}

                <div className="space-y-2">
                  <label className="font-bold">
                    {transferType === "internal" ? "接收方 0zk 地址" : "接收方 EVM 地址 (0x...)"}
                  </label>
                  <input 
                    type="text" 
                    placeholder={transferType === "internal" ? "0zk..." : "0x..."}
                    className="w-full p-4 border-2 border-black rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-bold">金額 (Amount)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full p-4 border-2 border-black rounded-lg text-xl font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                        {tokenAddress === ZeroAddress ? "ETH" : "ERC20"}
                    </span>
                  </div>
                  
                  <div className="text-right mt-2">
                    <p className="text-sm text-gray-500 font-bold">隱私餘額 (Private):</p>
                    {railgunAddress && (
                      <p className="text-sm text-gray-700 font-mono mb-2">
                        railgun address {NETWORK_CONFIG[TEST_NETWORK as NetworkName].proxyContract}
                      </p>
                    )}
                    {balances?.erc20Amounts.map((token) => {
                      const isEth = token.tokenAddress.toLowerCase() === ZeroAddress.toLowerCase();
                      const symbol = isEth ? "ETH" : `Token (${token.tokenAddress.slice(0,6)}...)`;
                      // 只顯示大於 0 的餘額
                      if (token.amount === 0n) return null;
                      return (
                      <p key={token.tokenAddress} className="text-sm text-gray-500">
                        {Number(formatEther(token.amount)).toFixed(4)} {symbol}
                      </p>
                      );
                    })}
                    {(!balances || balances.erc20Amounts.length === 0) && (
                        <p className="text-sm text-gray-500">0.0000 (No Balance)</p>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleTransfer}
                  className="w-full py-6 text-xl font-bold bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mt-4"
                >
                  發送交易
                </Button>
              </div>
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