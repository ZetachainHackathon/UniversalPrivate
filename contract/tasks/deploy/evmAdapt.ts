import { task } from 'hardhat/config';
import * as fs from 'fs';
import * as path from 'path';
import type { Contract } from 'ethers';

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

task('deploy:evmAdapt', 'Deploys EVMAdapt contract on EVM chains')
  .addParam('gatewayevm', 'Address of GatewayEVM contract on this EVM chain')
  .addOptionalParam('zetachainadapt', 'Address of ZetachainAdapt contract on ZetaChain (defaults to reading from zetachain-testnet.json)')
  .setAction(async function (
    { gatewayevm, zetachainadapt }: { gatewayevm: string; zetachainadapt?: string },
    hre,
  ) {
    const { ethers } = hre;
    await hre.run('compile');

    const deployer = (await ethers.getSigners())[0];

    // Load deployment config if zetachainadapt is not provided
    let deploymentConfig: any = null;
    if (!zetachainadapt) {
      console.log('\n=== Loading ZetaChain deployment configuration ===');
      try {
        deploymentConfig = loadDeploymentConfig('zetachain-testnet');
        console.log('✓ ZetaChain deployment configuration loaded successfully');
      } catch (error) {
        console.error('Failed to load ZetaChain deployment configuration:', error);
        throw new Error(
          'Please provide --zetachainadapt parameter or ensure zetachain-testnet.json deployment file exists',
        );
      }
    }

    // Use provided parameter or load from deployment config
    const zetachainAdaptAddress = zetachainadapt || deploymentConfig?.contracts?.ZetachainAdapt?.address;

    // Validate ZetachainAdapt address is available
    if (!zetachainAdaptAddress) {
      throw new Error('ZetachainAdapt address not provided and not found in deployment config');
    }

    console.log(`\n=== EVMAdapt Deployment ===`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`GatewayEVM: ${gatewayevm}`);
    console.log(`ZetachainAdapt: ${zetachainAdaptAddress}`);

    // Deploy EVMAdapt
    console.log('\n=== Deploying EVMAdapt ===');
    const EVMAdapt = await ethers.getContractFactory('EVMAdapt');
    const evmAdapt = await EVMAdapt.deploy(gatewayevm, zetachainAdaptAddress);
    await logVerify('EVMAdapt', evmAdapt, [gatewayevm, zetachainAdaptAddress]);

    // Output deployment config
    console.log('\n=== DEPLOYMENT COMPLETE ===');
    console.log('\nDEPLOY CONFIG:');
    console.log(
      JSON.stringify(
        {
          evmAdapt: evmAdapt.address,
          gatewayEVM: gatewayevm,
          zetachainAdapt: zetachainAdaptAddress,
          deployer: deployer.address,
        },
        null,
        2,
      ),
    );

    console.log('\n=== IMPORTANT ADDRESSES ===');
    console.log(`EVMAdapt: ${evmAdapt.address}`);
    console.log(`GatewayEVM: ${gatewayevm}`);
    console.log(`ZetachainAdapt: ${zetachainAdaptAddress}`);

    // Save deployment addresses to file
    console.log('\n=== SAVING DEPLOYMENT ADDRESSES ===');
    const deploymentsDir = path.join(__dirname, '../../deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentData = {
      network: hre.network.name,
      chainId: (await ethers.provider.getNetwork()).chainId,
      deployedAt: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        EVMAdapt: {
          address: evmAdapt.address,
          verified: false,
          description: "Cross-chain adapter for EVM chains to send messages to ZetaChain"
        }
      },
      externalContracts: {
        GatewayEVM: gatewayevm,
        ZetachainAdapt: zetachainAdaptAddress
      }
    };

    const deploymentFilePath = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentData, null, 2));
    console.log(`✓ Saved deployment addresses to: ${deploymentFilePath}`);

    console.log('\n=== 🎉 DEPLOYMENT COMPLETE ===');
    console.log(`\n💡 To check deployment status, run:`);
    console.log(`   npx hardhat run deployments/check_deployments.js --network ${hre.network.name}\n`);
  });

