"use client";

import { useState } from "react";
import { 
  generateViewKey, 
  createViewOnlyWallet 
} from "@/lib/railgun/wallet-actions";

export default function WatchPage() {
  const [password, setPassword] = useState("");
  const [myWalletId, setMyWalletId] = useState(""); // 假設使用者已登入並知道 ID
  const [generatedKey, setGeneratedKey] = useState("");
  
  const [inputViewKey, setInputViewKey] = useState("");
  const [status, setStatus] = useState("");

  // 功能 A: 產生我的查看金鑰 (給別人看)
  const handleGenerate = async () => {
    try {
      // 這裡假設你已經從 localStorage 或是 Context 拿到當前登入的 ID
      // 實際專案中，這裡應該自動填入 railgunWalletInfo.id
      if (!myWalletId) return alert("請輸入當前錢包 ID");
      
      const key = await generateViewKey(myWalletId);
      setGeneratedKey(key);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // 功能 B: 匯入別人的查看金鑰 (我看別人)
  const handleImport = async () => {
    if (!password || !inputViewKey) return alert("請輸入密碼和 View Key");
    setStatus("正在匯入...");
    try {
      const info = await createViewOnlyWallet(password, inputViewKey);
      setStatus(`✅ 匯入成功！正在觀察錢包 ID: ${info.id}`);
    } catch (e: any) {
      setStatus(`❌ 失敗: ${e.message}`);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">只讀錢包管理 (View-Only)</h1>

      {/* 區塊 1: 分享我的錢包 */}
      <div className="border p-4 rounded bg-blue-50">
        <h2 className="font-bold mb-2">1. 分享我的錢包</h2>
        <input 
          type="text" 
          placeholder="我的 Wallet ID"
          className="w-full p-2 border rounded mb-2"
          value={myWalletId}
          onChange={e => setMyWalletId(e.target.value)}
        />
        <button onClick={handleGenerate} className="bg-blue-600 text-white px-4 py-2 rounded">
          產生查看金鑰
        </button>
        {generatedKey && (
          <div className="mt-2 bg-white p-2 break-all border text-sm">
            {generatedKey}
          </div>
        )}
      </div>

      {/* 區塊 2: 觀察別人的錢包 */}
      <div className="border p-4 rounded bg-green-50">
        <h2 className="font-bold mb-2">2. 觀察別人的錢包</h2>
        <input 
          type="password" 
          placeholder="解鎖密碼 (用於儲存此只讀錢包)"
          className="w-full p-2 border rounded mb-2"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <textarea 
          placeholder="貼上對方的 View Key (81開頭的長字串)"
          className="w-full p-2 border rounded mb-2 h-24"
          value={inputViewKey}
          onChange={e => setInputViewKey(e.target.value)}
        />
        <button onClick={handleImport} className="bg-green-600 text-white px-4 py-2 rounded">
          匯入觀察
        </button>
        <p className="mt-2 font-bold">{status}</p>
      </div>
    </div>
  );
}