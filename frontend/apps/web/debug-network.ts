
import { NetworkName, NETWORK_CONFIG } from '@railgun-community/shared-models';

console.log("=== Debug Network Info ===");
console.log("NetworkName Enum:", NetworkName);
console.log("NETWORK_CONFIG Keys:", Object.keys(NETWORK_CONFIG));

try {
    const zetaName = "ZetaChain Athens";
    const config = NETWORK_CONFIG[zetaName as NetworkName];
    console.log(`Config for '${zetaName}':`, config ? "Found" : "UNDEFINED");
} catch (e) {
    console.error("Error accessing config:", e);
}
