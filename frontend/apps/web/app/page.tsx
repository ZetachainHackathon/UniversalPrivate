"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/components/button";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";

export default function LoginPage() {
  const { isConnected, address, connectWallet } = useWallet();
  const { login, create } = useRailgun(); // Use Context
  const router = useRouter();

  // Login State
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Create/Import State
  const [importMnemonic, setImportMnemonic] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Status Message
  const [statusMsg, setStatusMsg] = useState("");

  const handleLogin = async () => {
    if (!loginPassword) {
      setStatusMsg("❌ 請輸入密碼");
      return;
    }
    setIsLoggingIn(true);
    setStatusMsg("⏳ 正在登入...");
    try {
      // Use Context login to set encryptionKey
      await login(loginPassword);
      setStatusMsg("✅ 登入成功！");
      router.push("/cross-chain");
    } catch (error: any) {
      console.error(error);
      setStatusMsg(`❌ 登入失敗: ${error.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateOrImport = async () => {
    if (!importMnemonic || !importPassword) {
      setStatusMsg("❌ 請輸入助記詞與密碼");
      return;
    }
    setIsCreating(true);
    setStatusMsg("⏳ 正在創建/匯入錢包...");
    try {
      // Use create with 2 arguments (password, mnemonic?)
      // If importMnemonic is present, it will be strictly used (Import)
      // If empty, a new one will be generated (Create)
      const mnemonic = await create(importPassword, importMnemonic);
      setStatusMsg("✅ 錢包創建成功！");
      router.push("/cross-chain");
    } catch (error: any) {
      console.error(error);
      setStatusMsg(`❌ 失敗: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header Section */}
      <header className="w-full p-6 flex justify-between items-center bg-white border-b border-gray-200">
        <div className="text-2xl font-bold text-gray-800 border-2 border-black px-8 py-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
          登入頁面
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
        <div className="w-full max-w-5xl border-2 border-black rounded-2xl p-8 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

          {/* Status Message */}
          {statusMsg && (
            <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-lg border-2 border-blue-200 text-center font-bold shadow-[4px_4px_0px_0px_rgba(191,219,254,1)]">
              {statusMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">

            {/* Left Column: Login */}
            <div className="flex flex-col h-full border-2 border-black rounded-xl p-8 bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-black mb-8 text-center tracking-tight">已有帳號 (Login)</h2>

              <div className="flex-1 flex flex-col justify-center gap-6">
                <div className="space-y-3">
                  <label className="text-base font-bold ml-1">Password</label>
                  <input
                    type="password"
                    placeholder="請輸入密碼"
                    className="w-full p-4 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-10">
                <Button
                  className="w-full py-6 text-lg font-bold bg-black text-white hover:bg-gray-800 border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? "登入中..." : "登入"}
                </Button>
              </div>
            </div>

            {/* Right Column: Import/Create */}
            <div className="flex flex-col h-full border-2 border-black rounded-xl p-8 bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-black mb-8 text-center tracking-tight">匯入 / 創建 (Import)</h2>

              <div className="flex-1 flex flex-col justify-center gap-6">
                <div className="space-y-3">
                  <label className="text-base font-bold ml-1">助記詞 (Mnemonic)</label>
                  <textarea
                    placeholder="請輸入 12 個單字的助記詞..."
                    className="w-full p-4 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 bg-white min-h-[120px] resize-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                    value={importMnemonic}
                    onChange={(e) => setImportMnemonic(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-base font-bold ml-1">Password</label>
                  <input
                    type="password"
                    placeholder="設定新密碼"
                    className="w-full p-4 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-10">
                <Button
                  className="w-full py-6 text-lg font-bold bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  onClick={handleCreateOrImport}
                  disabled={isCreating}
                >
                  {isCreating ? "處理中..." : "執行"}
                </Button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}


