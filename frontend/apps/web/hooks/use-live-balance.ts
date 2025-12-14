import { useState, useEffect, useCallback } from "react";
import { Contract, formatEther, ZeroAddress, Signer } from "ethers";

export const useLiveBalance = (
    signer: Signer | undefined,
    address: string | undefined,
    tokenAddress: string,
    selectedChain: string // Used to trigger refresh on chain change
) => {
    const [balance, setBalance] = useState("0");
    const [loading, setLoading] = useState(false);

    const fetchBalance = useCallback(async () => {
        if (!signer || !address) return;

        setLoading(true);
        try {
            let bal = 0n;
            if (tokenAddress === ZeroAddress) {
                if (signer.provider) {
                    bal = await signer.provider.getBalance(address);
                }
            } else {
                // ERC20
                const contract = new Contract(tokenAddress, ["function balanceOf(address) view returns (uint256)"], signer) as any;
                bal = await contract.balanceOf(address);
            }
            setBalance(formatEther(bal));
        } catch (e: any) {
            // Ignore network errors during switching
            if (e.code !== 'NETWORK_ERROR') {
                console.error("無法讀取餘額:", e);
                setBalance("0");
            }
        } finally {
            setLoading(false);
        }
    }, [signer, address, tokenAddress, selectedChain]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!mounted) return;
            await fetchBalance();
        };

        load();

        return () => {
            mounted = false;
        };
    }, [fetchBalance]);

    return { balance, loading, refetch: fetchBalance };
};
