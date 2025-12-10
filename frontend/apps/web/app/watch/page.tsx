"use client";

import { useState } from "react";
import { formatUnits } from "ethers";
import { 
  generateViewKey, 
  loadPrivateWallet 
} from "@/lib/railgun/wallet-actions";
import { 
  setupBalanceListeners, 
  triggerBalanceRefresh,
  triggerFullRescan, // 👈 引入新函式
  getSpendableBalances,
  clearRailgunStorage
} from "@/lib/railgun/balance";
import { RailgunBalancesEvent, RailgunWalletBalanceBucket } from "@railgun-community/shared-models";

// ... (TOKEN_MAP 保持不變) ...
const TOKEN_MAP: Record<string, { symbol: string, decimals: number }> = {
  "0x0000000000000000000000000000000000000000": { symbol: "ETH (Native)", decimals: 18 },
  "0xfff9976782d46cc05630d1f6ebab18b2324d6b14": { symbol: "WETH", decimals: 18 },
};

export default function WatchPage() {
  // ... (State 保持不變) ...
  const [balancePassword, setBalancePassword] = useState("");
  const [balances, setBalances] = useState<any[]>([]); 
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [scanStatus, setScanStatus] = useState("");
  
  const [sharePassword, setSharePassword] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");

  // 🔥 修改 handleScanBalance，加入 mode 參數
  const handleScanBalance = async (isFullScan: boolean = false) => {
    if (!balancePassword) return alert("請輸入密碼");

    // 🔥 如果是完整掃描，直接執行核彈重置
    if (isFullScan) {
        if (confirm("這將清除本地快取並重新整理網頁，以執行從 0% 開始的完整掃描。\n(您的資金很安全，只需重新登入即可)\n\n是否繼續？")) {
            await clearRailgunStorage();
        }
        return; // 網頁會重整，所以這裡直接 return
    }
    
    setIsScanning(true);
    setProgress(0);
    setScanStatus(isFullScan ? "1. 初始化完整掃描..." : "1. 初始化快速掃描...");
    setBalances([]); // 清空畫面讓使用者知道有在動作

    try {
      setupBalanceListeners(
        (prog: number) => {
          const percent = Math.round(prog * 100);
          setProgress(percent);
          if (percent > 0 && percent < 100) {
             setScanStatus(`2. 正在掃描區塊鏈... ${percent}%`);
          }
        },
        (event: RailgunBalancesEvent) => {
          if (event.balanceBucket === RailgunWalletBalanceBucket.Spendable) {
             setBalances(event.erc20Amounts);
          }
        }
      );

      const walletInfo = await loadPrivateWallet(balancePassword);
      if (!walletInfo?.id) throw new Error("無法取得錢包 ID");

      setScanStatus(isFullScan ? "2. 執行歷史回溯掃描 (較慢)..." : "2. 執行快速掃描...");

      // 🔥 根據按鈕決定呼叫哪個函式
      if (isFullScan) {
        await triggerFullRescan(walletInfo.id);
      } else {
        await triggerBalanceRefresh(walletInfo.id);
      }

      // 手動補撈
      const cachedData = getSpendableBalances();
      if (cachedData) {
        setBalances(cachedData.erc20Amounts);
      }

      setScanStatus("✅ 掃描完成！");
      setProgress(100);

    } catch (e: any) {
      console.error(e);
      setScanStatus(`❌ 掃描失敗: ${e.message}`);
    } finally {
      setTimeout(() => setIsScanning(false), 1000);
    }
  };

  // ... (handleGenerate 保持不變) ...
  const handleGenerate = async () => { /*...*/ };

  return (
    <div className="p-8 max-w-xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">隱私錢包管理</h1>

      <div className="border p-6 rounded-lg bg-purple-50 shadow-sm border-purple-200">
        <h2 className="text-xl font-bold mb-4 text-purple-800 flex items-center gap-2">
          💰 我的隱私餘額 (0zk)
        </h2>
        
        <div className="flex flex-col gap-3 mb-4">
            <input 
                type="password" 
                placeholder="輸入密碼以掃描..."
                className="w-full p-2 border rounded text-sm"
                value={balancePassword}
                onChange={e => setBalancePassword(e.target.value)}
            />
            
            <div className="flex gap-2">
                {/* 快速掃描按鈕 */}
                <button 
                    onClick={() => handleScanBalance(false)}
                    disabled={isScanning}
                    className={`flex-1 px-4 py-2 rounded text-white font-bold transition-colors ${
                        isScanning ? "bg-purple-300" : "bg-purple-600 hover:bg-purple-700"
                    }`}
                >
                    {isScanning ? `掃描中 ${progress}%` : "快速掃描 (Refresh)"}
                </button>

                {/* 完整掃描按鈕 */}
                <button 
                    onClick={() => handleScanBalance(true)}
                    disabled={isScanning}
                    className={`flex-1 px-4 py-2 rounded text-purple-700 font-bold border border-purple-600 transition-colors ${
                        isScanning ? "bg-gray-100 text-gray-400 border-gray-300" : "bg-transparent hover:bg-purple-100"
                    }`}
                >
                    完整掃描 (Full Scan)
                </button>
            </div>
        </div>

        {/* ... (進度條和餘額列表部分保持不變) ... */}
        {isScanning && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div className="bg-purple-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        <p className="text-sm font-bold text-gray-700 mb-2">{scanStatus}</p>

        <div className="space-y-2">
            {balances.length > 0 ? balances.map((item, idx) => {
                const tokenInfo = TOKEN_MAP[item.tokenAddress.toLowerCase()] || { symbol: "Unknown", decimals: 18 };
                const amount = formatUnits(item.amount, tokenInfo.decimals);
                return (
                    <div key={idx} className="bg-white p-3 rounded border flex justify-between items-center shadow-sm">
                        <div>
                            <p className="font-bold text-gray-800">{tokenInfo.symbol}</p>
                            <p className="text-xs text-gray-500 font-mono">{item.tokenAddress.slice(0, 10)}...{item.tokenAddress.slice(-6)}</p>
                        </div>
                        <p className="font-mono text-lg font-bold text-purple-700">{parseFloat(amount).toFixed(4)}</p>
                    </div>
                );
            }) : (
                !isScanning && <p className="text-gray-500 text-sm">暫無餘額數據 (或餘額為 0)</p>
            )}
        </div>
      </div>

      {/* ... (分享區塊保持不變) ... */}
      <div className="border p-6 rounded-lg bg-blue-50 shadow-sm">
         <h2 className="text-xl font-bold mb-4 text-blue-800">👀 分享我的錢包</h2>
         {/* ... */}
         <div className="flex gap-2">
            <input type="password" className="flex-1 p-2 border rounded" placeholder="密碼" value={sharePassword} onChange={e => setSharePassword(e.target.value)} />
            <button onClick={handleGenerate} className="bg-blue-600 text-white px-4 rounded">產生 Key</button>
         </div>
         {generatedKey && <p className="mt-2 text-xs text-gray-600 break-all bg-white p-2 border">{generatedKey}</p>}
      </div>
    </div>
  );
}