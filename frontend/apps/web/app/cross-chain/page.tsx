"use client";

import { useState, useEffect } from "react";
import { parseUnits, isAddress } from "ethers";
import { executeCrossChainShield } from "@/lib/railgun/cross-chain-shield";
import { loadPrivateWallet } from "@/lib/railgun/wallet-actions";
// 👇 1. Import the hook
import { useWallet } from "@/components/providers/wallet-provider";

// Default values (for testing)
const DEFAULT_ADAPT_ADDRESS = "0xc8B2bc79c5f59F6589a20de8CA1b0aF0b00dF8FF"; // Sepolia EVMAdapt
const DEFAULT_TOKEN_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // Sepolia ERC20

export default function CrossChainPage() {
  // 👇 2. Destructure what we need from the wallet context
  const { isConnected, signer, address, balance, checkNetwork, connectWallet } = useWallet();

  const [password, setPassword] = useState("");
  const [adaptAddress, setAdaptAddress] = useState(DEFAULT_ADAPT_ADDRESS);
  const [tokenAddress, setTokenAddress] = useState(DEFAULT_TOKEN_ADDRESS);
  const [amount, setAmount] = useState("0.01");
  
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Optional: Auto-check connection status on mount
  useEffect(() => {
    if (!isConnected) {
      setStatus("⚠️ Please connect MetaMask first");
    } else {
      setStatus(""); // Clear warning if connected
    }
  }, [isConnected]);

  const handleShield = async () => {
    // 1. Basic Validation
    if (!password) return alert("Please enter your password to load your Railgun address.");
    if (!isAddress(adaptAddress) || !isAddress(tokenAddress)) return alert("Invalid contract address format.");

    // 2. Wallet Connection Check
    if (!isConnected || !signer) {
      try {
        await connectWallet(); // Try to connect if not connected
        return; // Stop here and let the user click again after connecting
      } catch (e) {
        return alert("Failed to connect wallet.");
      }
    }

    // 3. Network Check (Sepolia ID: 11155111)
    const isSepolia = await checkNetwork(11155111n);
    if (!isSepolia) {
      return alert("Please switch MetaMask to Sepolia Testnet!");
    }

    setIsLoading(true);
    setStatus("⏳ Preparing transaction...");
    setTxHash("");

    try {
      // 4. Load Railgun Wallet (to get 0zk destination)
      setStatus("🔐 Loading Railgun private address...");
      const walletInfo = await loadPrivateWallet(password);
      const my0zkAddress = walletInfo.railgunAddress;
      console.log("Recipient 0zk:", my0zkAddress);

      // 5. Execute Shield
      setStatus("⏳ Executing Cross-Chain Shield (Please sign in MetaMask)...");
      
      const amountBigInt = parseUnits(amount, 18); // Assuming 18 decimals

      // 👇 Use the signer from our context!
      const tx = await executeCrossChainShield(
        my0zkAddress,
        adaptAddress,
        tokenAddress,
        amountBigInt,
        signer, 
      );

      setStatus("✅ Transaction sent! Waiting for confirmation...");
      await tx.wait();
      
      setTxHash(tx.hash);
      setStatus("🎉 Cross-Chain Shield Successful! Assets will arrive on ZetaChain shortly.");

    } catch (e: any) {
      console.error(e);
      setStatus(`❌ Failed: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      
      {/* 👇 Header: Wallet Status */}
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
        <div>
            <h1 className="text-2xl font-bold text-indigo-600">Cross-Chain Shield</h1>
            <p className="text-xs text-gray-500">Sepolia ⮕ ZetaChain</p>
        </div>
        <div className="text-right">
            {isConnected ? (
                <>
                    <p className="text-sm font-bold text-gray-700">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                    <p className="text-xs text-green-600 font-mono">
                        {parseFloat(balance).toFixed(4)} ETH
                    </p>
                </>
            ) : (
                <button 
                    onClick={connectWallet}
                    className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
                >
                    Connect Wallet
                </button>
            )}
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
        <p>This deposits tokens from <strong>Sepolia</strong> into your <strong>ZetaChain</strong> private Railgun balance.</p>
        <p className="mt-1 font-bold">⚠️ Requirements:</p>
        <ul className="list-disc list-inside text-xs">
          <li>MetaMask on Sepolia</li>
          <li>Sepolia ETH (Gas)</li>
          <li>ERC20 Tokens to shield</li>
        </ul>
      </div>

      <div className="space-y-4 border p-6 rounded-lg bg-white shadow-sm">
        <div>
          <label className="block text-sm font-bold mb-1">EVMAdapt Address (Sepolia)</label>
          <input 
            className="w-full p-2 border rounded font-mono text-sm bg-gray-50" 
            value={adaptAddress} 
            onChange={e => setAdaptAddress(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Token Address (Sepolia ERC20)</label>
          <input 
            className="w-full p-2 border rounded font-mono text-sm" 
            value={tokenAddress} 
            onChange={e => setTokenAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Amount</label>
          <input 
            type="number"
            className="w-full p-2 border rounded"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Railgun Password</label>
          <input 
            type="password"
            className="w-full p-2 border rounded"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password to generate recipient address"
          />
        </div>

        <button 
          onClick={handleShield}
          disabled={isLoading}
          className={`w-full py-3 rounded text-white font-bold transition-colors ${
            isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isLoading ? "Processing..." : "Shield to ZetaChain"}
        </button>

        {/* Status Display */}
        <div className="min-h-[3rem] text-center">
          <p className={`font-bold ${status.includes("Failed") || status.includes("⚠️") || status.includes("❌") ? "text-red-600" : "text-gray-700"}`}>
            {status}
          </p>
          {txHash && (
            <a 
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline text-sm mt-1 block"
            >
              View on Etherscan
            </a>
          )}
        </div>
      </div>
    </div>
  );
}