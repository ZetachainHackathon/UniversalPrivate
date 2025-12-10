"use client";

import { useEffect, useState } from "react";
import { parseUnits, isAddress, formatEther, ZeroAddress } from "ethers"; 
import { executeCrossChainShield } from "@/lib/railgun/cross-chain-shield";
import { loadPrivateWallet } from "@/lib/railgun/wallet-actions";
import { useWallet } from "@/components/providers/wallet-provider";
import { Button } from "@repo/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";

// 預設值 (Sepolia)
const DEFAULT_ADAPT_ADDRESS = "0xc8B2bc79c5f59F6589a20de8CA1b0aF0b00dF8FF"; 
const DEFAULT_TOKEN_ADDRESS = ZeroAddress; // 預設使用原生代幣 (ETH)

const SEPOLIA_CHAIN_ID_DEC = 11155111n;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export default function CrossChainPage() {
  // 從 Context 取得 signer 和 address
  const { isConnected, signer, address, checkNetwork, connectWallet, switchNetwork } = useWallet();

  // State
  const [password, setPassword] = useState("");
  const [railgunAddress, setRailgunAddress] = useState("");
  const [adaptAddress, setAdaptAddress] = useState(DEFAULT_ADAPT_ADDRESS);
  const [tokenAddress, setTokenAddress] = useState(DEFAULT_TOKEN_ADDRESS);
  const [amount, setAmount] = useState("0.01");
  const [recipient, setRecipient] = useState(""); // For Transfer
  
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveBalance, setLiveBalance] = useState("0");

  // 載入 Railgun 地址 (如果已經登入過)
  useEffect(() => {
    // 這裡可以嘗試自動載入，或者要求使用者再次輸入密碼
    // 為了簡化，我們假設使用者在登入頁面輸入的密碼可以暫存，或者這裡再輸入一次
    // 這裡先留空，讓使用者手動輸入密碼來解鎖
  }, []);

  // 監聽餘額
  useEffect(() => {
    const refreshBalance = async () => {
      if (signer && address) {
        try {
          const bal = await signer.provider?.getBalance(address);
          if (bal) setLiveBalance(formatEther(bal));
        } catch (e) { console.error("無法讀取餘額:", e); }
      }
    };
    if (isConnected) refreshBalance();
  }, [signer, address, isConnected]);

  // 載入錢包資訊
  const handleLoadWallet = async () => {
    if (!password) return alert("請輸入密碼");
    try {
      const walletInfo = await loadPrivateWallet(password);
      setRailgunAddress(walletInfo.railgunAddress);
    } catch (e: any) {
      alert("載入失敗: " + e.message);
    }
  };

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

    const isSepolia = await checkNetwork(SEPOLIA_CHAIN_ID_DEC);
    if (!isSepolia) {
      if (confirm("切換至 Sepolia 網路？")) await switchNetwork(SEPOLIA_CHAIN_ID_HEX);
      return;
    }

    setIsLoading(true);
    setStatus("⏳ 正在準備 Shield 交易...");
    setTxHash("");

    try {
      const amountBigInt = parseUnits(amount, 18); 
      // 強制使用 Native Token (ETH) 支付
      const tx = await executeCrossChainShield(
        railgunAddress,
        adaptAddress,
        tokenAddress,
        amountBigInt,
        signer,
        true 
      );

      setStatus("✅ 交易已送出！等待上鏈...");
      await tx.wait();
      setTxHash(tx.hash);
      setStatus("🎉 Shield 成功！");
    } catch (error: any) {
      console.error(error);
      setStatus("❌ 交易失敗: " + (error.reason || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // 執行 Transfer (轉帳) - 尚未實作
  const handleTransfer = async () => {
    alert("轉帳功能開發中...");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
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
                  <select className="w-full p-3 border-2 border-black rounded-lg bg-white font-medium">
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
                    <option value={ZeroAddress}>Native ETH</option>
                    <option value="0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0">Test ERC20</option>
                  </select>
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
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">ETH</span>
                </div>
                <p className="text-sm text-gray-500 text-right">錢包餘額: {Number(liveBalance).toFixed(4)} ETH</p>
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
                    <input type="radio" name="txType" className="w-5 h-5 accent-black" defaultChecked />
                    轉給隱私地址 (0zk)
                  </label>
                  <label className="flex items-center gap-2 font-bold cursor-pointer text-gray-500">
                    <input type="radio" name="txType" className="w-5 h-5 accent-black" disabled />
                    跨鏈轉帳 (Coming Soon)
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="font-bold">接收方地址 (Recipient)</label>
                  <input 
                    type="text" 
                    placeholder="0zk..." 
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
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">ETH</span>
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