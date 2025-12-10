"use client";

import { useEffect, useState } from "react";
// 👇 1. 記得引入 formatEther
import { parseUnits, isAddress, formatEther } from "ethers"; 
import { executeCrossChainShield } from "@/lib/railgun/cross-chain-shield";
import { loadPrivateWallet } from "@/lib/railgun/wallet-actions";
import { useWallet } from "@/components/providers/wallet-provider";

// 預設值 (Sepolia)
const DEFAULT_ADAPT_ADDRESS = "0xc8B2bc79c5f59F6589a20de8CA1b0aF0b00dF8FF"; 
const DEFAULT_TOKEN_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; 

const SEPOLIA_CHAIN_ID_DEC = 11155111n;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export default function CrossChainPage() {
  // 從 Context 取得 signer 和 address
  const { isConnected, signer, address, checkNetwork, connectWallet, switchNetwork } = useWallet();

  const [password, setPassword] = useState("");
  const [adaptAddress, setAdaptAddress] = useState(DEFAULT_ADAPT_ADDRESS);
  const [tokenAddress, setTokenAddress] = useState(DEFAULT_TOKEN_ADDRESS);
  const [amount, setAmount] = useState("0.01");
  
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 👇 2. 新增一個本地 State 來存最新的餘額
  const [liveBalance, setLiveBalance] = useState("0");

  // 👇 3. 新增這個 useEffect: 當 signer 或 address 改變時，強制重抓餘額
  useEffect(() => {
    const refreshBalance = async () => {
      if (signer && address) {
        try {
          // 直接問區塊鏈當前的餘額
          const bal = await signer.provider?.getBalance(address);
          if (bal) {
            setLiveBalance(formatEther(bal));
          }
        } catch (e) {
          console.error("無法讀取餘額:", e);
        }
      }
    };

    if (isConnected) {
      refreshBalance();
    }
  }, [signer, address, isConnected]); // 依賴項目

  // 自動檢查連接狀態
  useEffect(() => {
    if (!isConnected) {
      setStatus("⚠️ 請先連接 MetaMask");
    } else {
      setStatus("");
    }
  }, [isConnected]);

  const handleShield = async () => {
    if (!password) return alert("請輸入密碼以讀取您的 0zk 地址");
    if (!isAddress(adaptAddress) || !isAddress(tokenAddress)) return alert("合約地址格式錯誤");

    if (!isConnected || !signer) {
      try {
        await connectWallet(); 
        return; 
      } catch (e) {
        return alert("連接錢包失敗");
      }
    }

    // 檢查網路 (Sepolia ID: 11155111)
    const isSepolia = await checkNetwork(SEPOLIA_CHAIN_ID_DEC);
    if (!isSepolia) {
      const confirmSwitch = confirm("您目前不在 Sepolia 網路。是否切換網路以進行跨鏈操作？");
      if (confirmSwitch) {
        await switchNetwork(SEPOLIA_CHAIN_ID_HEX);
      }
      return; // 切換會重整頁面，所以這裡直接 return
    }

    setIsLoading(true);
    setStatus("⏳ 正在準備交易...");
    setTxHash("");

    try {
      setStatus("🔐 正在讀取 Railgun 隱私地址...");
      const walletInfo = await loadPrivateWallet(password);
      const my0zkAddress = walletInfo.railgunAddress;
      console.log("Recipient 0zk:", my0zkAddress);

      setStatus("⏳ 正在執行跨鏈 Shield (請在 MetaMask 簽署)...");
      
      const amountBigInt = parseUnits(amount, 18); 

      const tx = await executeCrossChainShield(
        my0zkAddress,
        adaptAddress,
        tokenAddress,
        amountBigInt,
        signer,
        true // 👈 強制使用 Native Token (ETH) 支付，即使 tokenAddress 是 ZRC20
      );

      setStatus("✅ 交易已送出！等待上鏈...");
      await tx.wait();
      
      setTxHash(tx.hash);
      setStatus("🎉 跨鏈 Shield 成功！資產即將跨鏈至 ZetaChain。");

      // 交易成功後，順便再更新一次餘額
      const newBal = await signer.provider?.getBalance(address!);
      if (newBal) setLiveBalance(formatEther(newBal));

    } catch (e: any) {
      console.error(e);
      setStatus(`❌ 失敗: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
        <div>
            <h1 className="text-2xl font-bold text-indigo-600">Cross-Chain Shield</h1>
            <p className="text-xs text-gray-500">Sepolia ⮕ ZetaChain</p>
        </div>
        <div className="text-right">
            {isConnected ? (
                <>
                    <p className="text-sm font-bold text-gray-700">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                    {/* 👇 4. 這裡改用 liveBalance 顯示 */}
                    <p className="text-xs text-green-600 font-mono">
                        {parseFloat(liveBalance).toFixed(4)} SepoliaETH
                    </p>
                </>
            ) : (
                <button 
                    onClick={connectWallet}
                    className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
                >
                    Connect Wallet
                </button>
            )}
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
        <p>此功能將從 <strong>Sepolia</strong> 網路存款，並在 <strong>ZetaChain</strong> 上的 Railgun 隱私錢包中接收。</p>
        <p className="mt-1 font-bold">⚠️ 前置要求：</p>
        <ul className="list-disc list-inside text-xs">
          <li>MetaMask 必須切換到 Sepolia</li>
          <li>MetaMask 帳號必須有 Sepolia ETH (Gas)</li>
          <li>MetaMask 帳號必須有要存入的 ERC20 代幣</li>
        </ul>
      </div>

      <div className="space-y-4 border p-6 rounded-lg bg-white shadow-sm">
        <div>
          <label className="block text-sm font-bold mb-1">EVMAdapt Address (Sepolia)</label>
          <input 
            className="w-full p-2 border rounded font-mono text-sm bg-gray-50" 
            value={adaptAddress} 
            onChange={e => setAdaptAddress(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Token Address (Sepolia ERC20)</label>
          <input 
            className="w-full p-2 border rounded font-mono text-sm" 
            value={tokenAddress} 
            onChange={e => setTokenAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Amount</label>
          <input 
            type="number"
            className="w-full p-2 border rounded"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Railgun Password</label>
          <input 
            type="password"
            className="w-full p-2 border rounded"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password to generate recipient address"
          />
        </div>

        <button 
          onClick={handleShield}
          disabled={isLoading}
          className={`w-full py-3 rounded text-white font-bold transition-colors ${
            isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isLoading ? "Processing..." : "Shield to ZetaChain"}
        </button>

        <div className="min-h-[3rem] text-center">
          <p className={`font-bold ${status.includes("Failed") || status.includes("⚠️") || status.includes("❌") ? "text-red-600" : "text-gray-700"}`}>
            {status}
          </p>
          {txHash && (
            <a 
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline text-sm mt-1 block"
            >
              View on Etherscan
            </a>
          )}
        </div>
      </div>
    </div>
  );
}