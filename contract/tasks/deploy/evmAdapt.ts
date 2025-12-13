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

task('deploy:evmAdapt', 'Deploys EVMAdapt contract on EVM chains')
  .addParam('gatewayevm', 'Address of GatewayEVM contract on this EVM chain')
  .addParam('zetachainadapt', 'Address of ZetachainAdapt contract on ZetaChain')
  .setAction(async function (
    { gatewayevm, zetachainadapt }: { gatewayevm: string; zetachainadapt: string },
    hre,
  ) {
    const { ethers } = hre;
    await hre.run('compile');

    const deployer = (await ethers.getSigners())[0];

    console.log(`\nDeployer: ${deployer.address}`);
    console.log(`GatewayEVM: ${gatewayevm}`);
    console.log(`ZetachainAdapt: ${zetachainadapt}`);

    // Deploy EVMAdapt
    console.log('\n=== Deploying EVMAdapt ===');
    const EVMAdapt = await ethers.getContractFactory('EVMAdapt');
    const evmAdapt = await EVMAdapt.deploy(gatewayevm, zetachainadapt);
    await logVerify('EVMAdapt', evmAdapt, [gatewayevm, zetachainadapt]);

    // Output deployment config
    console.log('\n=== DEPLOYMENT COMPLETE ===');
    console.log('\nDEPLOY CONFIG:');
    console.log(
      JSON.stringify(
        {
          evmAdapt: evmAdapt.address,
          gatewayEVM: gatewayevm,
          zetachainAdapt: zetachainadapt,
          deployer: deployer.address,
        },
        null,
        2,
      ),
    );

    console.log('\n=== IMPORTANT ADDRESSES ===');
    console.log(`EVMAdapt: ${evmAdapt.address}`);
    console.log(`GatewayEVM: ${gatewayevm}`);
    console.log(`ZetachainAdapt: ${zetachainadapt}`);

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
        ZetachainAdapt: zetachainadapt
      }
    };

    const deploymentFilePath = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentData, null, 2));
    console.log(`✓ Saved deployment addresses to: ${deploymentFilePath}`);

    console.log('\n=== 🎉 DEPLOYMENT COMPLETE ===');
    console.log(`\n💡 To check deployment status, run:`);
    console.log(`   npx hardhat run deployments/check_deployments.js --network ${hre.network.name}\n`);
  });

