import { JsonRpcProvider, Wallet } from "ethers";
import { TEST_PRIVATE_KEY, TEST_RPC_URL } from "@/constants";
// 将可复用的工具函数放在这里

/**
 * 格式化日期
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN").format(date);
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


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