import { task } from 'hardhat/config';

import { listArtifacts, loadArtifacts } from '../../helpers/logic/artifacts';
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

task('deploy:zetachain', 'Creates deployment for ZetaChain')
  .addParam('weth9', 'Address of existing WETH9 wrapped base token contract on ZetaChain')
  .addOptionalParam('admin', 'Admin address (defaults to deployer)', '')
  .setAction(async function ({ weth9, admin }: { weth9: string; admin: string }, hre) {
    const { ethers } = hre;
    await hre.run('compile');

    const deployer = (await ethers.getSigners())[0];
    const adminAddress = admin || deployer.address;

    console.log(`\nDeployer: ${deployer.address}`);
    console.log(`Admin: ${adminAddress}`);
    console.log(`WETH9: ${weth9}`);

    // Get build artifacts
    const PoseidonT3 = await ethers.getContractFactory('PoseidonT3');
    const PoseidonT4 = await ethers.getContractFactory('PoseidonT4');
    const Proxy = await ethers.getContractFactory('PausableUpgradableProxy');
    const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    const RelayAdapt = await ethers.getContractFactory('RelayAdapt');
    const TreasuryImplementation = await ethers.getContractFactory('Treasury');

    // Deploy Poseidon libraries
    console.log('\n=== Deploying Poseidon Libraries ===');
    const poseidonT3 = await PoseidonT3.deploy();
    await logVerify('PoseidonT3', poseidonT3, []);
    
    const poseidonT4 = await PoseidonT4.deploy();
    await logVerify('PoseidonT4', poseidonT4, []);

    // Get Railgun Smart Wallet factory with libraries
    const RailgunSmartWallet = await ethers.getContractFactory('RailgunSmartWallet', {
      libraries: {
        PoseidonT3: poseidonT3.address,
        PoseidonT4: poseidonT4.address,
      },
    });

    // Deploy ProxyAdmin
    console.log('\n=== Deploying Proxy Admin ===');
    const proxyAdmin = await ProxyAdmin.deploy(adminAddress);
    await logVerify('Proxy Admin', proxyAdmin, [adminAddress]);

    // Deploy Treasury implementation
    console.log('\n=== Deploying Treasury ===');
    const treasuryImplementation = await TreasuryImplementation.deploy();
    await logVerify('Treasury Implementation', treasuryImplementation, []);

    // Deploy Treasury proxy
    const treasuryProxy = await Proxy.deploy(proxyAdmin.address);
    await logVerify('Treasury Proxy', treasuryProxy, [proxyAdmin.address]);

    // Deploy Railgun proxy
    console.log('\n=== Deploying Railgun Proxy ===');
    const proxy = await Proxy.deploy(proxyAdmin.address);
    await logVerify('Railgun Proxy', proxy, [proxyAdmin.address]);

    // Deploy Railgun implementation
    console.log('\n=== Deploying Railgun Implementation ===');
    const implementation = await RailgunSmartWallet.deploy();
    await logVerify('Railgun Implementation', implementation, []);

    // Set implementation for proxies
    console.log('\n=== Setting Proxy Implementations ===');
    await (await proxyAdmin.upgrade(proxy.address, implementation.address)).wait();
    await (await proxyAdmin.unpause(proxy.address)).wait();
    await (await proxyAdmin.upgrade(treasuryProxy.address, treasuryImplementation.address)).wait();
    await (await proxyAdmin.unpause(treasuryProxy.address)).wait();

    // Get proxied contracts
    const treasury = TreasuryImplementation.attach(treasuryProxy.address);
    const railgun = RailgunSmartWallet.attach(proxy.address);

    // Initialize contracts
    console.log('\n=== Initializing Contracts ===');
    // Initialize Treasury with admin as the admin
    await (await treasury.initializeTreasury(adminAddress)).wait();
    
    // Initialize Railgun with:
    // - treasury: treasury proxy address
    // - shieldFee: 25 (0.25%)
    // - unshieldFee: 25 (0.25%)
    // - nftFee: 0
    // - owner: admin address
    await (
      await railgun.initializeRailgunLogic(
        treasuryProxy.address,
        25n, // shieldFee: 0.25%
        25n, // unshieldFee: 0.25%
        0n,  // nftFee: 0
        adminAddress,
        { gasLimit: 2000000 },
      )
    ).wait();

    // Set SNARK artifacts (verification keys)
    console.log('\n=== Setting SNARK Artifacts ===');
    await loadArtifacts(railgun, listArtifacts());

    // Transfer contract ownerships to admin
    console.log('\n=== Transferring Ownerships ===');
    await (await railgun.transferOwnership(adminAddress)).wait();
    await (await proxyAdmin.transferOwnership(adminAddress)).wait();

    // Deploy RelayAdapt
    console.log('\n=== Deploying Relay Adapt ===');
    const relayAdapt = await RelayAdapt.deploy(proxy.address, weth9);
    await logVerify('Relay Adapt', relayAdapt, [proxy.address, weth9]);

    // Deploy ZetachainAdapt
    console.log('\n=== Deploying Zetachain Adapt ===');
    const ZetachainAdapt = await ethers.getContractFactory('ZetachainAdapt');
    const zetachainAdapt = await ZetachainAdapt.deploy(proxy.address);
    await logVerify('Zetachain Adapt', zetachainAdapt, [proxy.address]);

    // Output deployment config
    console.log('\n=== DEPLOYMENT COMPLETE ===');
    console.log('\nDEPLOY CONFIG:');
    console.log(JSON.stringify({
      implementation: implementation.address,
      proxy: proxy.address,
      proxyAdmin: proxyAdmin.address,
      treasuryImplementation: treasuryImplementation.address,
      treasuryProxy: treasuryProxy.address,
      relayAdapt: relayAdapt.address,
      zetachainAdapt: zetachainAdapt.address,
      poseidonT3: poseidonT3.address,
      poseidonT4: poseidonT4.address,
      weth9: weth9,
      admin: adminAddress,
    }, null, 2));

    console.log('\n=== IMPORTANT ADDRESSES ===');
    console.log(`Railgun Proxy (Main Contract): ${proxy.address}`);
    console.log(`Relay Adapt: ${relayAdapt.address}`);
    console.log(`Zetachain Adapt: ${zetachainAdapt.address}`);
    console.log(`Treasury: ${treasuryProxy.address}`);
    console.log(`Admin: ${adminAddress}`);

    // Verify contracts on block explorer (skip for hardhat network)
    if (hre.network.name !== 'hardhat') {
      console.log('\n=== VERIFYING CONTRACTS ON BLOCKSCOUT ===');

      // 1) Railgun implementation (無 constructor args)
      try {
        await hre.run('verify:verify', {
          address: implementation.address,
          constructorArguments: [],
        });
        console.log('✓ Verified Railgun Implementation');
      } catch (e) {
        console.warn('Railgun Implementation verify failed:', e);
      }

      // 2) Treasury implementation
      try {
        await hre.run('verify:verify', {
          address: treasuryImplementation.address,
          constructorArguments: [],
        });
        console.log('✓ Verified Treasury Implementation');
      } catch (e) {
        console.warn('Treasury Implementation verify failed:', e);
      }

      // 3) RelayAdapt(proxy, weth9)
      try {
        await hre.run('verify:verify', {
          address: relayAdapt.address,
          constructorArguments: [proxy.address, weth9],
        });
        console.log('✓ Verified RelayAdapt');
      } catch (e) {
        console.warn('RelayAdapt verify failed:', e);
      }

      // 4) ZetachainAdapt(proxy)
      try {
        await hre.run('verify:verify', {
          address: zetachainAdapt.address,
          constructorArguments: [proxy.address],
        });
        console.log('✓ Verified ZetachainAdapt');
      } catch (e) {
        console.warn('ZetachainAdapt verify failed:', e);
      }
    }
  });

