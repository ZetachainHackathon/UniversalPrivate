"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BrowserProvider, JsonRpcSigner, formatEther } from "ethers";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  signer: JsonRpcSigner | null;
  balance: string; // ETH balance
  connectWallet: () => Promise<void>;
  checkNetwork: (chainId: bigint) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

export const useWallet = () => useContext(WalletContext);

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState("0");

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
    } catch (error) {
      console.error("連接錢包失敗:", error);
    }
  };

  const checkNetwork = async (targetChainId: bigint) => {
    if (!signer) return false;
    const network = await signer.provider.getNetwork();
    return network.chainId === targetChainId;
  };

  // 監聽帳號切換
  useEffect(() => {
    if ((window as any).ethereum) {
      (window as any).ethereum.on("accountsChanged", () => {
        window.location.reload();
      });
      (window as any).ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <WalletContext.Provider value={{ isConnected, address, signer, balance, connectWallet, checkNetwork }}>
      {children}
    </WalletContext.Provider>
  );
}