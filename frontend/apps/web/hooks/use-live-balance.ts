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

        // 檢查 tokenAddress 是否有效
        if (tokenAddress !== ZeroAddress && (!tokenAddress || !tokenAddress.startsWith('0x') || tokenAddress.length !== 42)) {
            console.warn(`Invalid token address: ${tokenAddress}`);
            setBalance("0");
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            let bal = 0n;
            if (tokenAddress === ZeroAddress) {
                if (signer.provider) {
                    bal = await signer.provider.getBalance(address);
                }
            } else {
                // ERC20
                try {
                    const contract = new Contract(tokenAddress, ["function balanceOf(address) view returns (uint256)"], signer) as any;

                    // 檢查合約是否存在
                    if (!signer.provider) {
                        throw new Error("No provider available");
                    }

                    const code = await signer.provider.getCode(tokenAddress);
                    if (code === '0x') {
                        throw new Error(`Contract not found at address: ${tokenAddress}`);
                    }

                    bal = await contract.balanceOf(address);

                    // 檢查返回值是否有效
                    if (bal === undefined || bal === null) {
                        console.warn(`balanceOf returned invalid value for token ${tokenAddress}`);
                        bal = 0n;
                    }
                } catch (contractError: any) {
                    console.warn(`ERC20 balance check failed for ${tokenAddress}:`, contractError.message);

                    // 如果是 BAD_DATA 錯誤，可能是合約沒有實現 balanceOf
                    if (contractError.code === 'BAD_DATA') {
                        console.warn(`Token ${tokenAddress} may not be a valid ERC20 contract`);
                    }

                    // 重新拋出錯誤讓外層 catch 處理
                    throw contractError;
                }
            }
            setBalance(formatEther(bal));
        } catch (e: any) {
            console.warn(`Balance fetch failed for token ${tokenAddress}:`, e.message);

            // 處理不同類型的錯誤
            if (e.code === 'NETWORK_ERROR' || e.code === 'TIMEOUT') {
                // 網路錯誤，忽略（可能是在切換網路）
                console.log("Network error during balance fetch, ignoring...");
            } else if (e.code === 'BAD_DATA') {
                // 合約數據錯誤
                console.warn(`Invalid ERC20 contract at ${tokenAddress}`);
                setBalance("0");
            } else if (e.message?.includes('Contract not found')) {
                // 合約不存在
                console.warn(`Contract not deployed at ${tokenAddress}`);
                setBalance("0");
            } else {
                // 其他錯誤
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
