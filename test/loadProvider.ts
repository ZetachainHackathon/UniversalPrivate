import {
  FallbackProviderJsonConfig,
  NETWORK_CONFIG,
  NetworkName,
} from "@railgun-community/shared-models";
import { loadProvider } from "@railgun-community/wallet";
import { TEST_NETWORK, TEST_RPC_URL } from "./constants";

// forked function, replace with your own provider
/**
 * Loads an Engine provider with the specified URL.
 *
 * This function initializes a provider for the test network using either:
 * 1. A local development provider (default: http://127.0.0.1:8600)
 * 2. External providers that can be uncommented and configured
 *
 * The provider is configured with fallback options, priorities, and weights
 * to ensure reliable connectivity.
 *
 * @param providerUrl - The URL of the primary provider, defaults to "http://127.0.0.1:8600"
 * @returns A Promise that resolves when the provider is successfully loaded
 *
 * @example
 * // Load with default local provider
 * await loadEngineProvider();
 *
 * // Load with custom provider URL
 * await loadEngineProvider("http://my-custom-provider:8600");
 */
export const loadEngineProvider = async (
  providerUrl = TEST_RPC_URL
) => {
  const TEST_PROVIDERS_JSON: FallbackProviderJsonConfig = {
    chainId: NETWORK_CONFIG[TEST_NETWORK].chain.id,
    providers: [
      // The following is an example of how to use a forked setup

      getProviderInfo(providerUrl),
      // These should be uncommented and filled in with your preferred providers.
      // The above is for using FORK only, do not mix them.
      //   {
      //     provider: "https://cloudflare-eth.com/",
      //     priority: 3,
      //     weight: 2,
      //     maxLogsPerBatch: 1,
      //   },
      //   {
      //     provider: "https://rpc.ankr.com/eth",
      //     priority: 2,
      //     weight: 2,
      //     maxLogsPerBatch: 1,
      //   },
    ],
  };

  const pollingInterval = 1000 * 60 * 5; // 5 min

  await loadProvider(
    TEST_PROVIDERS_JSON,
    TEST_NETWORK,
    pollingInterval,
  );
};

export const getProviderInfo = (providerUrl: string) => {
  return {
    provider: providerUrl,
    priority: 3,
    weight: 2,
    maxLogsPerBatch: 1,
  };
};