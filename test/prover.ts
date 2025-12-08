import { getProver, SnarkJSGroth16 } from "@railgun-community/wallet";
import { groth16 } from "snarkjs";

/**
 * Sets up the Groth16 proving system for the Node.js environment.
 *
 * This function configures the Railgun prover to use the SnarkJS Groth16 implementation.
 * It should be called before performing any zero-knowledge proof operations in a Node.js context.
 *
 * @remarks
 * The function uses the `getProver()` method to obtain the current prover instance
 * and sets the SnarkJS Groth16 implementation on it.
 *
 * @returns A Promise that resolves when the setup is complete
 *
 * @example
 * ```typescript
 * await setupNodeGroth16();
 * // Now the Railgun prover is configured to use Groth16 in Node.js
 * ```
 */
export const setupNodeGroth16 = async (): Promise<void> => {
  // @ts-ignore
  getProver().setSnarkJSGroth16(groth16 as SnarkJSGroth16);
};