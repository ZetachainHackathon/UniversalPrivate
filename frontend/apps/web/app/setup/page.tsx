"use client";

import { useState } from "react";
import { createMnemonic, createPrivateWallet, loadPrivateWallet } from "@/lib/railgun/wallet-actions";
import { useRailgun } from "@/components/providers/railgun-provider";

export default function SetupPage() {
  const { isReady } = useRailgun();
  const [mnemonic, setMnemonic] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  // 1. 產生助記詞
  const handleGenerate = () => {
    const newMnemonic = createMnemonic();
    setMnemonic(newMnemonic);
  };

  // 2. 創建錢包
  const handleCreate = async () => {
    if (!mnemonic || !password) return alert("請輸入密碼和助記詞");
    setStatus("正在創建錢包...");
    try {
      await createPrivateWallet(password, mnemonic);
      setStatus("✅ 錢包創建成功！您可以開始使用了。");
    } catch (error: any) {
      console.error(error);
      setStatus(`❌ 失敗: ${error.message}`);
    }
  };

  // 3. 登入 (載入舊錢包)
  const handleLogin = async () => {
    if (!password) return alert("請輸入密碼");
    setStatus("正在載入...");
    try {
      await loadPrivateWallet(password);
      setStatus("✅ 登入成功！");
    } catch (error: any) {
      console.error(error);
      setStatus(`❌ 登入失敗: ${error.message}`);
    }
  }

  if (!isReady) return <div>Railgun 引擎正在初始化...</div>;

  return (
    <div className="p-8 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">設定 Railgun 錢包</h1>
      
      <div className="border p-4 rounded bg-gray-50">
        <label className="block mb-2 font-bold">步驟 1: 設定密碼</label>
        <input 
          type="password" 
          placeholder="輸入密碼保護錢包"
          className="w-full p-2 border rounded"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>

      <div className="border p-4 rounded bg-gray-50">
        <label className="block mb-2 font-bold">步驟 2: 助記詞</label>
        <div className="flex gap-2 mb-2">
            <button onClick={handleGenerate} className="bg-blue-500 text-white px-3 py-1 rounded">
                隨機產生
            </button>
        </div>
        <textarea 
          className="w-full p-2 border rounded h-24 font-mono"
          value={mnemonic}
          onChange={e => setMnemonic(e.target.value)}
          placeholder="或是貼上您現有的 12 個單字..."
        />
      </div>

      <div className="flex gap-4">
        <button 
            onClick={handleCreate}
            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
            創建新錢包
        </button>
        <button 
            onClick={handleLogin}
            className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
        >
            登入舊錢包
        </button>
      </div>

      <p className="text-center font-bold text-red-500">{status}</p>
    </div>
  );
}