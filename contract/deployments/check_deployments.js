const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const provider = ethers.provider;

  // Use hre.network.name for better network detection
  const hre = require("hardhat");
  const networkName = hre.network.name;

  // Read deployment file
  const deploymentFile = path.join(__dirname, `${networkName}.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.error(`\n❌ Deployment file not found: ${deploymentFile}`);
    console.log("\n📁 Available networks:");
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.json'));
    if (files.length > 0) {
      files.forEach(f => console.log(`   - ${f.replace('.json', '')}`));
    } else {
      console.log("   (no deployment files found)");
    }
    console.log("\n💡 Tip: Deploy contracts first using:");
    console.log(`   npx hardhat deploy:zetachain --network ${networkName}\n`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

  console.log(`\n${"=".repeat(70)}`);
  console.log(`  Checking Contracts on ${deployment.network}`);
  console.log(`${"=".repeat(70)}\n`);
  console.log(`📍 Chain ID: ${deployment.chainId}`);
  console.log(`📅 Deployed At: ${deployment.deployedAt}`);
  console.log(`👤 Deployer: ${deployment.deployer}\n`);

  // Check contracts
  const contracts = Object.entries(deployment.contracts);
  let existingCount = 0;
  let verifiedCount = 0;

  console.log(`${"─".repeat(70)}`);
  console.log("CONTRACT VERIFICATION");
  console.log(`${"─".repeat(70)}\n`);

  for (const [name, info] of contracts) {
    const code = await provider.getCode(info.address);
    const hasCode = code !== "0x";
    const status = hasCode ? "✓" : "✗";
    const verified = info.verified ? "📝" : "  ";

    console.log(`${status} ${verified} ${name}`);
    console.log(`   Address: ${info.address}`);

    if (info.description) {
      console.log(`   ℹ️  ${info.description}`);
    }

    if (hasCode) {
      console.log(`   Code: ${code.length} bytes`);
      existingCount++;
      if (info.verified) verifiedCount++;
    } else {
      console.log(`   ⚠️  Contract not found on chain!`);
    }

    if (info.explorerUrl) {
      console.log(`   🔗 ${info.explorerUrl}`);
    }

    console.log();
  }

  // External contracts
  if (deployment.externalContracts) {
    console.log(`${"─".repeat(70)}`);
    console.log("EXTERNAL CONTRACTS");
    console.log(`${"─".repeat(70)}\n`);

    for (const [name, address] of Object.entries(deployment.externalContracts)) {
      console.log(`📦 ${name}`);
      console.log(`   Address: ${address}\n`);
    }
  }

  // Summary
  console.log(`${"=".repeat(70)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(70)}\n`);
  console.log(`Total Contracts:    ${contracts.length}`);
  console.log(`✓ Deployed:         ${existingCount}`);
  console.log(`✗ Missing:          ${contracts.length - existingCount}`);
  console.log(`📝 Verified:        ${verifiedCount}`);
  console.log(`⏳ Not Verified:    ${existingCount - verifiedCount}`);

  if (existingCount === contracts.length) {
    console.log(`\n✅ All contracts are deployed successfully!\n`);
  } else {
    console.log(`\n⚠️  Some contracts are missing. Please check deployment.\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
