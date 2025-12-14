# Deployment Records

This directory contains deployment records for all networks where the Railgun contracts have been deployed.

## File Structure

Each network has its own JSON file:
- `zetachain-testnet.json` - ZetaChain Athens Testnet
- `sepolia.json` - Ethereum Sepolia Testnet
- `mainnet.json` - Production deployment (future)

## JSON Format

```json
{
  "network": "network-name",
  "chainId": 7001,
  "deployedAt": "2025-12-13T09:00:00Z",
  "deployer": "0x...",
  "contracts": {
    "ContractName": {
      "address": "0x...",
      "verified": true,
      "description": "Optional description",
      "explorerUrl": "https://..."
    }
  },
  "externalContracts": {
    "WETH9": "0x...",
    "UniswapRouter": "0x..."
  }
}
```

## Usage

### Check Deployed Contracts

Verify all contracts are deployed and functioning:

```bash
# Check contracts on ZetaChain testnet
npx hardhat run deployments/check_deployments.js --network zetachain-testnet

# Check contracts on Sepolia
npx hardhat run deployments/check_deployments.js --network sepolia
```

The check script will:
- ✓ Verify each contract exists on-chain (via RPC)
- ✓ Display contract code sizes
- ✓ Show verification status
- ✓ Provide block explorer links
- ✓ Display summary statistics

### Update Deployment Records

Deployment records are automatically created/updated when you run deployment scripts:

```bash
npx hardhat deploy:railgun --network zetachain-testnet
```

This will:
1. Deploy all contracts
2. Save addresses to `deployments/zetachain-testnet.json`
3. Verify contracts on block explorer
4. Update verification status in the JSON file

### Manual Updates

If you need to manually update deployment records (e.g., after manual verification):

1. Edit the appropriate JSON file
2. Update the `verified` field to `true`
3. Add `explorerUrl` if available

Example:
```json
{
  "RailgunImplementation": {
    "address": "0x281D2F28B5F92aA05F552aAce93d0C003D53fB9B",
    "verified": true,
    "explorerUrl": "https://testnet.zetascan.com/address/0x281D2F28B5F92aA05F552aAce93d0C003D53fB9B#code"
  }
}
```

## Important Contracts

### Railgun Proxy (Main Contract)

This is the **main contract address** you should use for all interactions:
- Uses upgradeable proxy pattern
- Address stays constant across upgrades
- Points to the current implementation

```json
"RailgunProxy": {
  "address": "0x...",
  "description": "Main Railgun Smart Wallet contract (use this address for interactions)"
}
```

### RelayAdapt

Handles Railgun transactions with multicall support:
- Shield operations
- Transfer operations
- Relay operations with gas abstraction

### ZetachainAdapt

Cross-chain adapter for ZetaChain:
- Receives cross-chain messages
- Handles SHIELD/TRANSACT operations
- Manages cross-chain withdrawals

## Version Control

### What to Commit

✅ **DO commit** deployment records to git:
- Provides deployment history
- Enables team collaboration
- Documents contract addresses

❌ **DO NOT commit** private keys or sensitive data

### Git History

When deployment addresses change:
1. The deployment script overwrites the network JSON file
2. Git will show the diff with old and new addresses
3. Commit with a meaningful message:
   ```bash
   git add deployments/
   git commit -m "deploy: update ZetaChain testnet contracts"
   ```

## Troubleshooting

### Deployment file not found

```
❌ Deployment file not found: deployments/network-name.json
```

**Solution**: Deploy contracts first:
```bash
npx hardhat deploy:railgun --network zetachain-testnet
```

### Contract not found on chain

```
✗ ContractName
   ⚠️  Contract not found on chain!
```

**Possible causes**:
1. Wrong network selected
2. Deployment failed
3. JSON file has outdated addresses

**Solution**: Re-deploy or check network configuration

### Verification failed

If contract verification fails during deployment, you can manually verify:

```bash
npx hardhat verify --network zetachain-testnet CONTRACT_ADDRESS [CONSTRUCTOR_ARGS...]
```

Then manually update the JSON file's `verified` field to `true`.

## Network Information

### ZetaChain Athens Testnet

- Chain ID: 7001
- RPC: https://zetachain-athens.g.allthatnode.com/archive/evm
- Explorer: https://testnet.zetascan.com
- Faucet: https://labs.zetachain.com/get-zeta

### External Contracts

These are third-party contracts that our system depends on:

- **WETH9**: Wrapped base token (e.g., WZETA on ZetaChain)
- **ZetaChain Gateway**: Official ZetaChain cross-chain gateway
- **Uniswap Router**: DEX router for token swaps

## Best Practices

1. **Always check deployments** after deploying:
   ```bash
   npx hardhat run deployments/check_deployments.js --network <network>
   ```

2. **Verify contracts** immediately after deployment for transparency

3. **Document changes** in git commits when addresses change

4. **Keep backups** of deployment files before major updates

5. **Test on testnet** before mainnet deployment
