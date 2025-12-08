import { JsonRpcProvider, Wallet } from "ethers";
import { TEST_PRIVATE_KEY, TEST_RPC_URL, SEPOLIA_RPC_URL } from "./constants";

/**
 * Creates and returns a provider and wallet for JSON-RPC interactions.
 *
 * This utility function initializes a JSON-RPC provider with a test URL
 * and creates a wallet from a test mnemonic phrase. Both the provider
 * and wallet are returned as an object.
 *
 * @returns An object containing the initialized provider and wallet
 * @property {JsonRpcProvider} provider - The JSON-RPC provider instance
 * @property {Wallet} wallet - The wallet instance created from the test mnemonic
 *
 * @example
 * const { provider, wallet } = getProviderWallet();
 * // Now use provider for RPC calls and wallet for signing transactions
 */
export const getProviderWallet = () => {
  const provider = new JsonRpcProvider(TEST_RPC_URL);
  const wallet = new Wallet(TEST_PRIVATE_KEY as string, provider);

  return {
    provider,
    wallet,
  };
};

export const getSepoliaWallet = () => {
  const provider = new JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new Wallet(TEST_PRIVATE_KEY as string, provider);
  return {
    provider,
    wallet,
  };
};