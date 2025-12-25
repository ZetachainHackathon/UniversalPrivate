"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/components/button";
import { useWallet } from "@/components/providers/wallet-provider";
import { useRailgun } from "@/components/providers/railgun-provider";

export default function LoginPage() {
  const { isConnected, address, connectWallet, signer } = useWallet();
  const { login, create, scanProgress } = useRailgun(); // Use Context
  const router = useRouter();

  // Login State
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Create/Import State
  const [importMnemonic, setImportMnemonic] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const handleWalletLogin = async () => {
    if (!loginPassword) {
      setStatusMsg("❌ 請輸入密碼 (用於加密錢包)");
      return;
    }
    
    try {
      setIsLoggingIn(true);
      setStatusMsg("⏳ 請在錢包中簽名...");

      if (!isConnected || !signer) {
        await connectWallet();
      }

      if (!signer) {
         setStatusMsg("⚠️ 請先連接錢包，然後再次點擊登入");
         await connectWallet();
         setIsLoggingIn(false);
         return;
      }

      const signature = await signer.signMessage("Login to Universal Private Railgun Wallet");
      setStatusMsg("⏳ 正在生成錢包...");

      const { createMnemonicFromSignature } = await import("@/lib/railgun/wallet-actions");
      const mnemonic = createMnemonicFromSignature(signature);
      
      // Create or Load using this mnemonic
      await create(loginPassword, mnemonic);
      
      setStatusMsg("✅ 錢包登入/創建成功！");
      router.push("/cross-chain");

    } catch (error: any) {
      console.error(error);
      setStatusMsg(`❌ 操作失敗: ${error.message}`);
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
      <main className="flex-1 flex items-center justify-center p-6 transition-all duration-500">
        <div className={`w-full transition-all duration-500 ease-in-out ${showAdvanced ? 'max-w-5xl' : 'max-w-md'} border-2 border-black rounded-2xl p-8 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden`}>

          {/* Status Message */}
          {statusMsg && (
            <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-lg border-2 border-blue-200 text-center font-bold shadow-[4px_4px_0px_0px_rgba(191,219,254,1)]">
              {statusMsg}
            </div>
          )}

          {/* Progress Bar - Independent of statusMsg */}
          {(scanProgress > 0 || isLoggingIn || isCreating) && (
            <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-lg border-2 border-blue-200 text-center font-bold shadow-[4px_4px_0px_0px_rgba(191,219,254,1)]">
              <div className="mb-2">
                {scanProgress > 0 ? "正在同步區塊資料..." : (isLoggingIn ? "正在登入..." : "正在創建/匯入錢包...")}
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5 dark:bg-blue-200 border border-blue-300">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, scanProgress * 100)}%` }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-blue-600 text-right">
                {Math.round(scanProgress * 100)}%
              </div>
            </div>
          )}

          <div className={`grid transition-all duration-500 ${showAdvanced ? 'grid-cols-1 md:grid-cols-2 gap-12' : 'grid-cols-1'}`}>
            
            {/* Left Column: Unified Login Card */}
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-black text-center tracking-tight">Access Wallet</h2>
              
              <div className="space-y-3">
                <label className="text-base font-bold ml-1">Password</label>
                <input
                  type="password"
                  placeholder="輸入密碼 (用於加密/解密)"
                  className="w-full p-4 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isLoggingIn) {
                      handleLogin();
                    }
                  }}
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  className="w-full py-4 text-lg font-bold bg-black text-white hover:bg-gray-800 border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? "登入中..." : "使用密碼登入"}
                </Button>
                
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <Button
                  className="w-full py-4 text-lg font-bold bg-white text-black border-2 border-black hover:bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  onClick={handleWalletLogin}
                  disabled={isLoggingIn}
                >
                  使用錢包簽名登入/註冊
                </Button>
              </div>

              <div className="mt-4 text-center">
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-gray-500 hover:text-black hover:underline transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  {showAdvanced ? "隱藏進階選項" : "進階選項：匯入助記詞"}
                </button>
              </div>
            </div>

            {/* Right Column: Advanced (Conditionally visible) */}
            {showAdvanced && (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-8 duration-500">
                <div className="h-full border-l-2 border-gray-100 pl-12 flex flex-col justify-center">
                  <h3 className="text-xl font-bold mb-6 text-center">匯入助記詞</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold ml-1">助記詞 (Mnemonic)</label>
                      <textarea
                        placeholder="請輸入 12 個單字的助記詞..."
                        className="w-full p-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 bg-white min-h-[100px] resize-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] text-sm"
                        value={importMnemonic}
                        onChange={(e) => setImportMnemonic(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold ml-1">設定新密碼</label>
                      <input
                        type="password"
                        placeholder="設定新密碼"
                        className="w-full p-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                        value={importPassword}
                        onChange={(e) => setImportPassword(e.target.value)}
                      />
                    </div>

                    <Button
                      className="w-full py-3 font-bold bg-gray-100 text-black border-2 border-black hover:bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                      onClick={handleCreateOrImport}
                      disabled={isCreating}
                    >
                      {isCreating ? "處理中..." : "匯入並創建"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}


