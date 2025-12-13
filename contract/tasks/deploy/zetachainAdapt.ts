import { task } from 'hardhat/config';
import type { Contract } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Log data to verify contract
 *
 * @param name - name of contract
 * @param contract - contract object
 * @param constructorArguments - constructor arguments
 * @returns promise resolved on deploy deployed
 */
async function logVerify(
  name: string,
  contract: Contract,
  constructorArguments: unknown[],
): Promise<null> {
  console.log(`\nDeploying ${name}`);
  console.log({
    address: contract.address,
    constructorArguments,
  });
  return contract.deployTransaction.wait().then();
}

/**
 * Load deployment configuration from file
 *
 * @param network - network name
 * @returns deployment configuration
 */
function loadDeploymentConfig(network: string): any {
  const deploymentsDir = path.join(__dirname, '../../deployments');
  const deploymentFile = path.join(deploymentsDir, `${network}.json`);

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const content = fs.readFileSync(deploymentFile, 'utf8');
  return JSON.parse(content);
}

task('deploy:zetachainAdapt', 'Deploys ZetachainAdapt contract on ZetaChain')
  .addOptionalParam('railgun', 'Address of Railgun Smart Wallet contract on ZetaChain')
  .addOptionalParam('uniswaprouter', 'Address of Uniswap Router contract on ZetaChain')
  .addOptionalParam('relayadapt', 'Address of RelayAdapt contract on ZetaChain')
  .setAction(async function (
    {
      railgun,
      uniswaprouter,
      relayadapt,
    }: {
      railgun?: string;
      uniswaprouter?: string;
      relayadapt?: string;
    },
    hre,
  ) {
    const ethers = hre.ethers;
    await hre.run('compile');

    const deployer = (await ethers.getSigners())[0];

    // Load deployment config if parameters are not provided
    let deploymentConfig: any = null;
    if (!railgun || !uniswaprouter || !relayadapt) {
      console.log(`\n=== Loading deployment configuration from ${hre.network.name}.json ===`);
      try {
        deploymentConfig = loadDeploymentConfig(hre.network.name);
        console.log('Deployment configuration loaded successfully');
      } catch (error) {
        console.error('Failed to load deployment configuration:', error);
        throw new Error(
          'Please provide all parameters (--railgun, --uniswaprouter, --relayadapt) or ensure deployment configuration file exists',
        );
      }
    }

    // Use provided parameters or load from deployment config
    const railgunAddress = railgun || deploymentConfig?.contracts?.RailgunProxy?.address;
    const uniswapRouterAddress = uniswaprouter || deploymentConfig?.externalContracts?.UniswapRouter;
    const relayAdaptAddress = relayadapt || deploymentConfig?.contracts?.RelayAdapt?.address;

    // Validate all addresses are available
    if (!railgunAddress) {
      throw new Error('Railgun Smart Wallet address not provided and not found in deployment config');
    }
    if (!uniswapRouterAddress) {
      throw new Error('Uniswap Router address not provided and not found in deployment config');
    }
    if (!relayAdaptAddress) {
      throw new Error('RelayAdapt address not provided and not found in deployment config');
    }

    console.log(`\n=== ZetachainAdapt Deployment ===`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Railgun Smart Wallet: ${railgunAddress}`);
    console.log(`Uniswap Router: ${uniswapRouterAddress}`);
    console.log(`RelayAdapt: ${relayAdaptAddress}`);

    // Validate addresses
    if (!ethers.utils.isAddress(railgunAddress)) {
      throw new Error(`Invalid Railgun Smart Wallet address: ${railgunAddress}`);
    }
    if (!ethers.utils.isAddress(uniswapRouterAddress)) {
      throw new Error(`Invalid Uniswap Router address: ${uniswapRouterAddress}`);
    }
    if (!ethers.utils.isAddress(relayAdaptAddress)) {
      throw new Error(`Invalid RelayAdapt address: ${relayAdaptAddress}`);
    }

    // Deploy ZetachainAdapt
    console.log('\n=== Deploying ZetachainAdapt ===');
    const ZetachainAdapt = await ethers.getContractFactory('ZetachainAdapt');
    const zetachainAdapt = await ZetachainAdapt.deploy(
      railgunAddress,
      uniswapRouterAddress,
      relayAdaptAddress,
    );
    await logVerify('ZetachainAdapt', zetachainAdapt, [
      railgunAddress,
      uniswapRouterAddress,
      relayAdaptAddress,
    ]);

    // Output deployment config
    console.log('\n=== DEPLOYMENT COMPLETE ===');
    console.log('\nDEPLOY CONFIG:');
    console.log(
      JSON.stringify(
        {
          zetachainAdapt: zetachainAdapt.address,
          railgunSmartWallet: railgunAddress,
          uniswapRouter: uniswapRouterAddress,
          relayAdapt: relayAdaptAddress,
          deployer: deployer.address,
          network: hre.network.name,
          chainId: (await ethers.provider.getNetwork()).chainId,
        },
        null,
        2,
      ),
    );

    console.log('\n=== IMPORTANT ADDRESSES ===');
    console.log(`ZetachainAdapt: ${zetachainAdapt.address}`);
    console.log(`Railgun Smart Wallet: ${railgunAddress}`);
    console.log(`Uniswap Router: ${uniswapRouterAddress}`);
    console.log(`RelayAdapt: ${relayAdaptAddress}`);

    console.log('\n=== VERIFICATION COMMAND ===');
    console.log(
      `npx hardhat verify --network ${hre.network.name} ${zetachainAdapt.address} ${railgunAddress} ${uniswapRouterAddress} ${relayAdaptAddress}`,
    );
  });

