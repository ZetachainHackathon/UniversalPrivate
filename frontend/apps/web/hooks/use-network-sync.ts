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

                    // 查找對應的鏈配置
                    for (const [key, config] of Object.entries(CONFIG.CHAINS)) {
                        if (BigInt(config.ID_DEC) === chainId) {
                            const chainValue = key.toLowerCase().replace(/_/g, "-");
                            if (selectedChain !== chainValue) {
                                setSelectedChain(chainValue);
                            }
                            break;
                        }
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
