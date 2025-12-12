import { Contract, type HDNodeWallet, type Wallet } from "ethers";
import {
  getShieldSignature,
  generateERC20ShieldRequests,
  serializeERC20Transfer,
} from "./transcation/util";
import {
  type ShieldRequestStruct,
  ByteUtils
} from "@railgun-community/engine";

import { getProviderWallet, getSepoliaWallet } from "./wallet";

// EVMAdapt contract ABI with complete struct definitions
const EVM_ADAPT_ABI = [
  {
    name: "shieldOnZetachain",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "_shieldRequests",
        type: "tuple[]",
        components: [
          {
            name: "preimage",
            type: "tuple",
            components: [
              {
                name: "npk",
                type: "bytes32",
              },
              {
                name: "token",
                type: "tuple",
                components: [
                  {
                    name: "tokenType",
                    type: "uint8", // TokenType enum: 0=ERC20, 1=ERC721, 2=ERC1155
                  },
                  {
                    name: "tokenAddress",
                    type: "address",
                  },
                  {
                    name: "tokenSubID",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "value",
                type: "uint120",
              },
            ],
          },
          {
            name: "ciphertext",
            type: "tuple",
            components: [
              {
                name: "encryptedBundle",
                type: "bytes32[3]",
              },
              {
                name: "shieldKey",
                type: "bytes32",
              },
            ],
          },
        ],
      },
    ],
    outputs: [],
  },
] as const;



/**
 * Calls EVMAdapt contract's shieldOnZetachain function
 * @param evmAdaptAddress - EVMAdapt contract address
 * @param wallet - Wallet to send transaction
 * @param shieldRequests - Array of ShieldRequest
 * @param value - ZETA amount to send for cross-chain fees
 * @returns Transaction response
 */
const shieldOnZetachain = async (
  evmAdaptAddress: string,
  wallet: Wallet | HDNodeWallet,
  shieldRequests: ShieldRequestStruct[],
  value: bigint = 0n,
) => {
  const evmAdapt = new Contract(evmAdaptAddress, EVM_ADAPT_ABI, wallet);
  const tx = await evmAdapt.shieldOnZetachain(shieldRequests, { value });
  return tx;
};

/**
 * Shield ERC20 tokens to Railgun via EVMAdapt contract
 * @param railgunAddress - Railgun recipient address
 * @param evmAdaptAddress - EVMAdapt contract address
 * @param tokenAddress - ERC20 token address to shield
 * @param amount - Token amount to shield
 */
const shieldERC20OnZetachain = async (
  railgunAddress: string,
  evmAdaptAddress: string,
  tokenAddress: string,
  amount: bigint,
) => {
  const providerWallet = getProviderWallet();
  const shieldPrivateKey = await getShieldSignature(providerWallet.wallet);
  const random = ByteUtils.randomHex(16);
  const shieldRequests = await generateERC20ShieldRequests(
    serializeERC20Transfer(tokenAddress, amount, railgunAddress),
    random,
    shieldPrivateKey,
  );

  const sepoliaWallet = getSepoliaWallet();
  const tx = await shieldOnZetachain(evmAdaptAddress, sepoliaWallet.wallet, [shieldRequests], amount);
  const receipt = await tx.wait();
  console.log("Shield transaction receipt", receipt);
};

const main = async () => {

  const EVM_ADAPT_ADDRESS = "0xc32AfcB92B92886ca08d288280127d5F1A535AaF"; // EVMAdapt address
  const ZRC20_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"; // ZETACHAIN ETH address(ZRC20)
  const AMOUNT = BigInt("10000000000000000"); // 0.001 ZETACHAIN ETH amount

  await shieldERC20OnZetachain(
    "0zk1qyk9nn28x0u3rwn5pknglda68wrn7gw6anjw8gg94mcj6eq5u48tlrv7j6fe3z53lama02nutwtcqc979wnce0qwly4y7w4rls5cq040g7z8eagshxrw5ajy990", // Railgun address
    EVM_ADAPT_ADDRESS, 
    ZRC20_ADDRESS, 
    AMOUNT, 
  );
  console.log("Shield transaction sent");
};

main();