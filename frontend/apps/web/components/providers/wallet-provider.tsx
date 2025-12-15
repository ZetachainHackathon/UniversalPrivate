"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BrowserProvider, JsonRpcSigner, formatEther } from "ethers";
import { CONFIG } from "@/config/env";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  signer: JsonRpcSigner | null;
  balance: string; // ETH balance
  currentChainId: bigint | null;
  currentChainName: string | null;
  connectWallet: () => Promise<void>;
  checkNetwork: (chainId: bigint) => Promise<boolean>;
  switchNetwork: (chainIdHex: string) => Promise<void>;
  getCurrentChainId: () => Promise<bigint | null>;
}

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

export const useWallet = () => useContext(WalletContext);

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState("0");
  const [currentChainId, setCurrentChainId] = useState<bigint | null>(null);
  const [currentChainName, setCurrentChainName] = useState<string | null>(null);

  // 根據 ChainId 獲取鏈名稱
  const getChainNameById = (chainId: bigint): string | null => {
    for (const [key, chain] of Object.entries(CONFIG.CHAINS)) {
      if (BigInt(chain.ID_DEC) === chainId) {
        return key;
      }
    }
    return null;
  };

  // 更新當前鏈信息
  const updateCurrentChain = async () => {
    if (!signer || !signer.provider) {
      setCurrentChainId(null);
      setCurrentChainName(null);
      return;
    }
    try {
      const network = await signer.provider.getNetwork();
      setCurrentChainId(network.chainId);
      const chainName = getChainNameById(network.chainId);
      setCurrentChainName(chainName);
    } catch (error) {
      console.error("獲取當前鏈信息失敗:", error);
      setCurrentChainId(null);
      setCurrentChainName(null);
    }
  };

  const connectWallet = async () => {

    if (!(window as any).ethereum) {

      alert("請安裝 MetaMask!");
      return;
    }

    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const _signer = await provider.getSigner();
      const _address = await _signer.getAddress();
      const _balance = await provider.getBalance(_address);

      setSigner(_signer);
      setAddress(_address);
      setBalance(formatEther(_balance));
      setIsConnected(true);
      await updateCurrentChain();
    } catch (error) {
      console.error("連接錢包失敗:", error);
    }
  };

  const checkNetwork = async (targetChainId: bigint) => {
    if (!signer) return false;
    const network = await signer.provider.getNetwork();
    return network.chainId === targetChainId;
  };

  // 👇 新增：切換網路函式
  const switchNetwork = async (chainIdHex: string) => {
    if (!(window as any).ethereum) return;
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
      // 切換後重新整理頁面以更新狀態
      // window.location.reload(); // 移除手動 reload，交給 chainChanged 事件處理
    } catch (error: any) {
      // 錯誤代碼 4902 代表錢包裡還沒新增這條鏈 (通常 Sepolia 預設都有，這裡先簡化處理)
      console.error("切換網路失敗:", error);
      alert("無法切換網路，請手動在 MetaMask 選擇 Sepolia");
    }
  };

  const getCurrentChainId = async (): Promise<bigint | null> => {
    if (!signer || !signer.provider) return null;
    try {
      const network = await signer.provider.getNetwork();
      return network.chainId;
    } catch (error) {
      console.error("獲取當前鏈 ID 失敗:", error);
      return null;
    }
  };

  // 監聽帳號切換
  useEffect(() => {
    if ((window as any).ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length > 0) {
          await connectWallet();
        } else {
          setIsConnected(false);
          setAddress(null);
          setSigner(null);
        }
      };

      const handleChainChanged = async () => {
        await connectWallet();
        await updateCurrentChain();
      };

      (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
      (window as any).ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if ((window as any).ethereum.removeListener) {
            (window as any).ethereum.removeListener("accountsChanged", handleAccountsChanged);
            (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  // 初始化時更新鏈信息
  useEffect(() => {
    if (isConnected && signer) {
      updateCurrentChain();
    } else {
      setCurrentChainId(null);
      setCurrentChainName(null);
    }
  }, [isConnected, signer]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WalletContext.Provider value={{ 
      isConnected, 
      address, 
      signer, 
      balance,
      currentChainId,
      currentChainName,
      connectWallet, 
      checkNetwork,
      switchNetwork,
      getCurrentChainId
    }}>
      {children}
    </WalletContext.Provider>
  );
}