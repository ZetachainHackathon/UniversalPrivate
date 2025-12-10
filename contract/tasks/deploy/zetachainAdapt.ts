import { task } from 'hardhat/config';
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

task('deploy:zetachainAdapt', 'Deploys ZetachainAdapt contract on ZetaChain')
  .addParam('railgun', 'Address of Railgun Smart Wallet contract on ZetaChain')
  .addParam('zetachaingateway', 'Address of ZetaChain Gateway contract on ZetaChain')
  .addParam('uniswaprouter', 'Address of Uniswap Router contract on ZetaChain')
  .addParam('relayadapt', 'Address of RelayAdapt contract on ZetaChain')
  .setAction(async function (
    {
      railgun,
      zetachaingateway,
      uniswaprouter,
      relayadapt,
    }: {
      railgun: string;
      zetachaingateway: string;
      uniswaprouter: string;
      relayadapt: string;
    },
    hre,
  ) {
    const ethers = hre.ethers;
    await hre.run('compile');

    const deployer = (await ethers.getSigners())[0];

    console.log(`\n=== ZetachainAdapt Deployment ===`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Railgun Smart Wallet: ${railgun}`);
    console.log(`ZetaChain Gateway: ${zetachaingateway}`);
    console.log(`Uniswap Router: ${uniswaprouter}`);
    console.log(`RelayAdapt: ${relayadapt}`);

    // Validate addresses
    if (!ethers.utils.isAddress(railgun)) {
      throw new Error(`Invalid Railgun Smart Wallet address: ${railgun}`);
    }
    if (!ethers.utils.isAddress(zetachaingateway)) {
      throw new Error(`Invalid ZetaChain Gateway address: ${zetachaingateway}`);
    }
    if (!ethers.utils.isAddress(uniswaprouter)) {
      throw new Error(`Invalid Uniswap Router address: ${uniswaprouter}`);
    }
    if (!ethers.utils.isAddress(relayadapt)) {
      throw new Error(`Invalid RelayAdapt address: ${relayadapt}`);
    }

    // Deploy ZetachainAdapt
    console.log('\n=== Deploying ZetachainAdapt ===');
    const ZetachainAdapt = await ethers.getContractFactory('ZetachainAdapt');
    const zetachainAdapt = await ZetachainAdapt.deploy(
      railgun,
      zetachaingateway,
      uniswaprouter,
      relayadapt,
    );
    await logVerify('ZetachainAdapt', zetachainAdapt, [
      railgun,
      zetachaingateway,
      uniswaprouter,
      relayadapt,
    ]);

    // Output deployment config
    console.log('\n=== DEPLOYMENT COMPLETE ===');
    console.log('\nDEPLOY CONFIG:');
    console.log(
      JSON.stringify(
        {
          zetachainAdapt: zetachainAdapt.address,
          railgunSmartWallet: railgun,
          zetachainGateway: zetachaingateway,
          uniswapRouter: uniswaprouter,
          relayAdapt: relayadapt,
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
    console.log(`Railgun Smart Wallet: ${railgun}`);
    console.log(`ZetaChain Gateway: ${zetachaingateway}`);
    console.log(`Uniswap Router: ${uniswaprouter}`);
    console.log(`RelayAdapt: ${relayadapt}`);

    console.log('\n=== VERIFICATION COMMAND ===');
    console.log(
      `npx hardhat verify --network ${hre.network.name} ${zetachainAdapt.address} ${railgun} ${zetachaingateway} ${uniswaprouter} ${relayadapt}`,
    );
  });

