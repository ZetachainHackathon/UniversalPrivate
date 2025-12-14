import * as dotenv from "dotenv";
import { NetworkName } from "@railgun-community/shared-models";
dotenv.config();

/**
 * The network used for testing purposes.
 * Currently set to Zetachain Testnet.
 * @constant {NetworkName}
 */
export const TEST_NETWORK = NetworkName.ZetachainTestnet;

/**
 * The RPC URL for RAILGUN test environment.
 * This constant retrieves the URL from the RAILGUN_TEST_RPC environment variable.
 * Used for connecting to the test blockchain network for RAILGUN operations.
 */
export const TEST_RPC_URL = "https://zetachain-athens.g.allthatnode.com/archive/evm";
export const SEPOLIA_RPC_URL = "https://1rpc.io/sepolia";
/**
 * The address of the wrapped base token for the test network.
 * This constant is derived from the network configuration for the test network.
 * @type {string}
 */
export const TEST_TOKEN = "0x0000c9ec4042283e8139c74f4c64bcd1e0b9b54f";

/**
 * The Ethereum address of a test NFT (Non-Fungible Token) contract.
 * This constant is used for testing purposes related to NFT functionality.
 * The actual address is abbreviated as "0x....".
 */
export const TEST_NFT_ADDRESS = "0x....";

/**
 * The sub-identifier for the test NFT.
 * This value is used to uniquely identify a specific NFT within a collection for testing purposes.
 * @constant {string}
 */
export const TEST_NFT_SUBID = "1";

/**
 * Test mnemonic phrase for RAILGUN.
 * Uses the environment variable RAILGUN_TEST_MNEMONIC if available,
 * otherwise falls back to a default test mnemonic.
 * @remarks This should only be used for testing purposes.
 */
export const TEST_PRIVATE_KEY = process.env.PRIVATE_KEY;

/**
 * A constant representing a test encryption key for development purposes.
 * This is a 64-character hexadecimal string (32 bytes) that can be used as a placeholder
 * or default encryption key in test environments.
 *
 * @remarks
 * Do not use this key in production environments as it is a publicly known value.
 */
export const TEST_ENCRYPTION_KEY =
  "0101010101010101010101010101010101010101010101010101010101010101";

/**
 * Deployment network names for contract address lookup
 */
export const ZETACHAIN_DEPLOYMENT_NETWORK = "zetachain-testnet";
export const SEPOLIA_DEPLOYMENT_NETWORK = "sepolia";

