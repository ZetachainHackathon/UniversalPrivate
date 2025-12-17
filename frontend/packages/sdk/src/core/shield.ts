import {
  NETWORK_CONFIG,
  NetworkName,
  TXIDVersion,
  RailgunERC20AmountRecipient,
} from "@railgun-community/shared-models";
import {
  gasEstimateForShield,
  populateShield,
} from "@railgun-community/wallet";
import {
  Contract,
  BaseContract,
  ContractTransactionResponse,
  type HDNodeWallet,
  type Wallet,
  type JsonRpcSigner,
  formatUnits
} from "ethers";

import {
  getGasDetailsForTransaction,
  getShieldSignature,
  serializeERC20Transfer
} from "./utils/transaction";

export const erc20ShieldGasEstimate = async (
  network: NetworkName,
  wallet: Wallet | HDNodeWallet | JsonRpcSigner,
  erc20AmountRecipients: RailgunERC20AmountRecipient[]
) => {
  // @ts-ignore
  const shieldPrivateKey = await getShieldSignature(wallet);
  const fromWalletAddress = await wallet.getAddress();

  const { gasEstimate } = await gasEstimateForShield(
    TXIDVersion.V2_PoseidonMerkle,
    network,
    shieldPrivateKey,
    erc20AmountRecipients,
    [], // nftAmountRecipients
    fromWalletAddress
  );

  return gasEstimate;
};

interface IERC20 extends BaseContract {
  allowance(owner: string, spender: string): Promise<bigint>;
  approve(spender: string, amount: bigint): Promise<ContractTransactionResponse>;
}

export const erc20PopulateShieldTransaction = async (
  network: NetworkName,
  wallet: Wallet | HDNodeWallet | JsonRpcSigner,
  erc20AmountRecipients: RailgunERC20AmountRecipient[],
  sendWithPublicWallet: boolean
) => {
  const spender = NETWORK_CONFIG[network].proxyContract;
  const walletAddress = await wallet.getAddress();

  // 1. Check and Execute Approve
  for (const amountRecipient of erc20AmountRecipients) {
    
    const contract = new Contract(
      amountRecipient.tokenAddress,
      [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
      ],
      wallet
    ) as unknown as IERC20 & { 
        balanceOf: (acc: string) => Promise<bigint>; 
    };

    const allowance = await contract.allowance(walletAddress, spender);
    
    if (allowance < amountRecipient.amount) {
      console.log(`⏳ Approving token: ${amountRecipient.tokenAddress}...`);
      const tx = await contract.approve(spender, amountRecipient.amount);
      await tx.wait(); 
      console.log("✅ Approved!");
    }
  }

  // 2. Estimate Shield Gas
  const gasEstimate = await erc20ShieldGasEstimate(
    network,
    wallet,
    erc20AmountRecipients
  );

  // @ts-ignore
  const shieldPrivateKey = await getShieldSignature(wallet);

  const gasDetails = await getGasDetailsForTransaction(
    network,
    gasEstimate,
    sendWithPublicWallet,
    wallet
  );

  // 3. Populate Shield Transaction
  const { transaction, nullifiers } = await populateShield(
    TXIDVersion.V2_PoseidonMerkle,
    network,
    shieldPrivateKey,
    erc20AmountRecipients,
    [],
    gasDetails
  );

  return {
    gasEstimate,
    gasDetails,
    transaction,
    nullifiers,
  };
};

export const executeShield = async (
    networkName: NetworkName,
    railgunAddress: string,
    tokenAddress: string,
    amount: bigint,
    signer: JsonRpcSigner | Wallet | HDNodeWallet
) => {
    const erc20AmountRecipients = [
        serializeERC20Transfer(
            tokenAddress,
            amount,
            railgunAddress
        ),
    ];

    const { transaction } = await erc20PopulateShieldTransaction(
        networkName,
        signer,
        erc20AmountRecipients,
        true // sendWithPublicWallet
    );

    const tx = await signer.sendTransaction(transaction);
    return tx;
};
