import { useEffect } from "react";
import { CONFIG } from "@/config/env";
import { Signer } from "ethers";

export const useNetworkSync = (
    signer: Signer | undefined,
    selectedChain: string,
    setSelectedChain: (chain: string) => void
) => {
    useEffect(() => {
        const syncChain = async () => {
            if (signer && signer.provider) {
                try {
                    const network = await signer.provider.getNetwork();

                    // isMounted check removed for brevity but good practice would be:
                    // if (!isMounted) return;

                    const chainId = network.chainId;

                    if (chainId === BigInt(CONFIG.CHAINS.SEPOLIA.ID_DEC) && selectedChain !== "sepolia") {
                        setSelectedChain("sepolia");
                    } else if (chainId === BigInt(CONFIG.CHAINS.ZETACHAIN.ID_DEC) && selectedChain !== "zetachain") {
                        setSelectedChain("zetachain");
                    }
                } catch (e: any) {
                    if (e.code !== 'NETWORK_ERROR') {
                        console.error("Failed to sync chain:", e);
                    }
                }
            }
        };
        syncChain();
    }, [signer, selectedChain, setSelectedChain]);
};
