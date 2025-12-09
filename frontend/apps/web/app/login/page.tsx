"use client";
import { useState } from "react";
import { useWallet } from "@/components/providers/wallet-provider"; // 引入我們剛寫的 hook
import { getEncryptionKeyFromPassword } from "@/lib/railgun/encryption";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { isConnected, connectWallet, address } = useWallet();
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      // 1. 驗證密碼
      await getEncryptionKeyFromPassword(password);
      // 2. 確保錢包已連接
      if (!isConnected) {
        await connectWallet();
      }
      // 3. 跳轉到功能頁
      router.push("/cross-chain");
    } catch (e) {
      alert("密碼錯誤或錢包連接失敗");
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">登入 DApp</h1>
      
      {/* 顯示錢包狀態 */}
      <div className="p-4 border rounded bg-gray-50">
        <p className="text-sm font-bold mb-2">MetaMask 狀態</p>
        {isConnected ? (
          <p className="text-green-600">✅ 已連接: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
        ) : (
          <button onClick={connectWallet} className="bg-orange-500 text-white px-4 py-2 rounded w-full">
            🦊 連接 MetaMask
          </button>
        )}
      </div>

      <input
        type="password"
        placeholder="輸入 Railgun 密碼"
        className="w-full p-2 border rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-2 rounded">
        進入系統
      </button>
    </div>
  );
}