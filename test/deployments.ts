import * as fs from "fs";
import * as path from "path";

/**
 * Deployment information for a network
 */
export interface DeploymentInfo {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: string;
  contracts: {
    [contractName: string]: {
      address: string;
      verified: boolean;
      description?: string;
      explorerUrl?: string;
    };
  };
  externalContracts?: {
    [contractName: string]: string;
  };
}

/**
 * Loads deployment information from the contract/deployments directory
 * @param network - Network name (e.g., "zetachain-testnet", "sepolia")
 * @returns Deployment information for the specified network
 */
export const loadDeployment = (network: string): DeploymentInfo => {
  const deploymentPath = path.join(
    __dirname,
    "../contract/deployments",
    `${network}.json`
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `Deployment file not found for network: ${network} at ${deploymentPath}`
    );
  }

  const deploymentData = fs.readFileSync(deploymentPath, "utf-8");
  return JSON.parse(deploymentData) as DeploymentInfo;
};

/**
 * Gets a specific contract address from deployment
 * @param network - Network name
 * @param contractName - Contract name (e.g., "ZetachainAdapt", "EVMAdapt")
 * @returns Contract address
 */
export const getContractAddress = (
  network: string,
  contractName: string
): string => {
  const deployment = loadDeployment(network);

  if (deployment.contracts[contractName]) {
    return deployment.contracts[contractName].address;
  }

  if (deployment.externalContracts?.[contractName]) {
    return deployment.externalContracts[contractName];
  }

  throw new Error(
    `Contract ${contractName} not found in ${network} deployment`
  );
};