"use client";

import { useState } from "react";
// 👇 引入 ethers 工具：雜湊簽名並轉成助記詞
import { keccak256, toUtf8Bytes, Mnemonic, getBytes } from "ethers";
import { createPrivateWallet } from "@/lib/railgun/wallet-actions";
import { useRailgun } from "@/components/providers/railgun-provider";
import { useWallet } from "@/components/providers/wallet-provider"; // 引入我們寫好的錢包 Hook

export default function SetupPage() {
  const { isReady } = useRailgun();
  const { isConnected, connectWallet, signer, address } = useWallet();
  
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🔥 核心功能：透過 MetaMask 簽名來登入/創建
  const handleWalletLogin = async () => {
    if (!password) return alert("請設定一個本地密碼 (用於加密儲存)");
    if (!isConnected || !signer) return alert("請先連接 MetaMask");

    setIsLoading(true);
    setStatus("請在 MetaMask 中簽署訊息...");

    try {
      // 1. 定義簽名訊息 (這段文字不能改，否則產生的助記詞會變)
      const signatureMessage = "Sign this message to access your Railgun Privacy Wallet.\n\nIMPORTANT: This signature will be used to generate your privacy keys.";
      
      // 2. 請求使用者簽名
      const signature = await signer.signMessage(signatureMessage);
      
      setStatus("正在演算隱私金鑰...");

      // 3. 將簽名 (Hex String) 進行雜湊，得到 32 bytes 的亂數種子 (Entropy)
      // 使用 keccak256 確保輸出是均勻的 32 bytes
      const entropy = keccak256(signature); // 這裡不用 toUtf8Bytes，因為 signature 本身就是 hex string

      // 4. 將 Entropy 轉為助記詞
      // 注意：ethers v6 的 getBytes 可以把 hex string 轉為 Uint8Array
      const mnemonic = Mnemonic.fromEntropy(getBytes(entropy)).phrase;

      console.log("🔐 隱私助記詞已生成 (僅在記憶體中):", mnemonic);

      // 5. 使用這個助記詞來 創建 或 載入 Railgun 錢包
      // 我們使用 createPrivateWallet，因為在我們的實作中，它會處理 setEncryptionKey
      setStatus("正在初始化 Railgun 錢包...");
      
      const walletInfo = await createPrivateWallet(password, mnemonic);
      
      setStatus(`✅ 成功！您的 0zk 地址: ${walletInfo.railgunAddress.slice(0, 10)}...`);

    } catch (error: any) {
      console.error(error);
      setStatus(`❌ 失敗: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady) return <div className="p-8">🚀 Railgun 引擎正在初始化...</div>;

  return (
    <div className="p-8 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-indigo-700">Railgun 錢包設定</h1>
      <p className="text-gray-600 text-sm">
        此模式將使用您的 MetaMask 簽名來產生隱私金鑰。只要您持有同一個 MetaMask 帳號，就能隨時登入。
      </p>

      {/* 步驟 1: 連接錢包 */}
      <div className={`border p-4 rounded transition-colors ${isConnected ? "bg-green-50 border-green-200" : "bg-gray-50"}`}>
        <label className="block mb-2 font-bold text-gray-700">步驟 1: 連接 MetaMask</label>
        {isConnected ? (
          <div className="flex items-center text-green-700 font-mono text-sm">
            <span className="mr-2">●</span>
            已連接: {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        ) : (
          <button 
            onClick={connectWallet} 
            className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 font-bold"
          >
            🦊 連接錢包
          </button>
        )}
      </div>

      {/* 步驟 2: 設定本地密碼 */}
      <div className="border p-4 rounded bg-white shadow-sm">
        <label className="block mb-2 font-bold text-gray-700">步驟 2: 設定本地保護密碼</label>
        <p className="text-xs text-gray-500 mb-2">
          此密碼用於加密儲存在瀏覽器中的資料庫，每次重新開啟網頁時需要輸入。
        </p>
        <input 
          type="password" 
          placeholder="請設定一組密碼..."
          className="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>

      {/* 步驟 3: 簽名並登入 */}
      <button 
        onClick={handleWalletLogin}
        disabled={!isConnected || !password || isLoading}
        className={`w-full py-4 rounded-lg text-white font-bold text-lg transition-all ${
          (!isConnected || !password) 
            ? "bg-gray-300 cursor-not-allowed" 
            : isLoading 
              ? "bg-indigo-400 cursor-wait" 
              : "bg-indigo-600 hover:bg-indigo-700 shadow-lg"
        }`}
      >
        {isLoading ? "處理中..." : "✍️ 簽名並登入 Railgun"}
      </button>

      {/* 狀態顯示 */}
      <div className="min-h-[3rem] text-center p-2 rounded bg-gray-50">
        <p className={`font-bold text-sm ${status.includes("失敗") ? "text-red-600" : "text-gray-700"}`}>
          {status}
        </p>
      </div>
    </div>
  );
}