import { NETWORK_CONFIG, NetworkName, FallbackProviderJsonConfig } from "@railgun-community/shared-models";
import { loadProvider } from "@railgun-community/wallet";

console.log("Zetachain Testnet Config:");
console.log(JSON.stringify(NETWORK_CONFIG[NetworkName.ZetachainTestnet], null, 2));

const run = async () => {
  const providerConfig: FallbackProviderJsonConfig = {
    chainId: 7001,
    providers: [
      {
        provider: "https://zetachain-athens.g.allthatnode.com/archive/evm",
        priority: 1,
        weight: 1,
        maxLogsPerBatch: 10,
        stallTimeout: 2500,
      }
    ],
  };

  try {
    await loadProvider(
      providerConfig,
      NetworkName.ZetachainTestnet,
      1000 * 60
    );
    console.log("Provider loaded successfully");
  } catch (e) {
    console.error("Error loading provider:", e);
  }
};

run();
