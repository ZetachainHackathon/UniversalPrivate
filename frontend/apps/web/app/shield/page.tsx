"use client";

import { useState } from "react";
import { useRailgun } from "@/components/providers/railgun-provider";
import { executeShieldERC20 } from "@/lib/railgun/shield";
import { loadPrivateWallet } from "@/lib/railgun/wallet-actions";
import { TEST_TOKEN } from "@/constants";

export default function ShieldPage() {
  const { isReady } = useRailgun();
  const [password, setPassword] = useState("");
  const [amount, setAmount] = useState("0.0001"); // 預設一點點做測試
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleShield = async () => {
    if (!password) return alert("請輸入密碼以取得隱私地址");
    setStatus("⏳ 正在讀取錢包...");
    
    try {
      // 1. 先取得我們自己的隱私地址 (要轉給自己)
      const walletInfo = await loadPrivateWallet(password);
      const my0zkAddress = walletInfo.railgunAddress;

      setStatus("⏳ 正在準備 Shield (可能需要 Approve)...");
      
      // 2. 轉換金額 (簡單處理 18 decimals)
      // 在正式 App 中建議用 ethers.parseUnits(amount, decimals)
      const amountInWei = BigInt(Number(amount) * 1e18);

      // 3. 執行 Shield
      const hash = await executeShieldERC20(my0zkAddress, TEST_TOKEN, amountInWei);
      
      setTxHash(hash);
      setStatus("✅ Shield 成功！");
    } catch (e: any) {
      console.error(e);
      setStatus(`❌ 失敗: ${e.message}`);
    }
  };

  if (!isReady) return <div className="p-8">Engine 初始化中...</div>;

  return (
    <div className="p-8 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Shield (存款到隱私帳戶)</h1>
      
      <div className="bg-yellow-50 p-4 rounded text-sm text-yellow-800">
        說明：此操作會將您 Public Wallet (測試帳號) 中的 WETH/WZETA 轉入 Railgun 合約，
        變成隱私餘額。
      </div>

      <div className="space-y-4 border p-4 rounded bg-white">
        <div>
          <label className="block text-sm font-bold mb-1">代幣地址</label>
          <input 
            className="w-full p-2 border rounded bg-gray-100" 
            value={TEST_TOKEN} 
            disabled 
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">數量</label>
          <input 
            type="number"
            className="w-full p-2 border rounded"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">錢包密碼 (用於獲取您的 0zk 地址)</label>
          <input 
            type="password"
            className="w-full p-2 border rounded"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <button 
          onClick={handleShield}
          className="w-full bg-indigo-600 text-white py-3 rounded hover:bg-indigo-700 font-bold"
        >
          開始 Shield
        </button>

        <p className="text-center font-bold min-h-[1.5rem]">{status}</p>
        
        {txHash && (
          <div className="text-xs break-all bg-gray-100 p-2 rounded">
            Tx Hash: {txHash}
          </div>
        )}
      </div>
    </div>
  );
}