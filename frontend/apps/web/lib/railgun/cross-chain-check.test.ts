import { describe, it, expect, vi } from 'vitest';
import { generateUnshieldOutsideChainData } from './cross-chain-transfer';
import { CONFIG } from '@/config/env';

// Mock dependencies
vi.mock('@railgun-community/wallet', () => ({
    getEngine: () => ({ scanContractHistory: vi.fn() }),
    gasEstimateForUnprovenCrossContractCalls: vi.fn().mockResolvedValue({ gasEstimate: 1000n }),
    generateCrossContractCallsProof: vi.fn(),
    populateProvedCrossContractCalls: vi.fn().mockResolvedValue({ transaction: { data: '0xmockeddata' } }),
}));

vi.mock('./encryption', () => ({
    getEncryptionKeyFromPassword: vi.fn().mockResolvedValue('mockKey'),
}));

vi.mock('./transaction-utils', () => ({
    serializeERC20RelayAdaptUnshield: vi.fn((token, amount) => ({ tokenAddress: token, amount })),
    getOriginalGasDetailsForTransaction: vi.fn(),
    getGasDetailsForTransaction: vi.fn().mockResolvedValue({ gasEstimate: 1000n }),
}));

// Use Manual Mock
vi.mock('ethers');

// Import mocked functions to assertion
import { mockPopulateTransaction } from '../../__mocks__/ethers';

describe('Cross-Chain Transfer Logic', () => {
    it('should generate unshield data with correct fees and calls', async () => {
        const password = '123';
        const railgunWalletId = 'id';
        const amount = 1000000n; // 1000000 units
        const recipient = '0x123';
        const signer = { provider: {} } as any; // Mock signer with provider

        const data = await generateUnshieldOutsideChainData(password, railgunWalletId, amount, recipient, signer);

        // Validation 1: Check Config usage
        const feeBps = CONFIG.FEES.UNSHIELD_BASIS_POINTS;
        // Calculation: 1000000 * (10000 - 25) / 10000 = 1000000 * 9975 / 10000 = 997500
        const expectedAmount = 997500n;

        // Validation 2: Verify Call Counts (Transfer + Withdraw)
        expect(mockPopulateTransaction).toHaveBeenCalledTimes(2);

        // Validation 3: Verify Arguments for Transfer (ZRC20 -> Adapt)
        expect(mockPopulateTransaction).toHaveBeenCalledWith(
            CONFIG.CONTRACTS.ZETACHAIN_ADAPT,
            expectedAmount
        );

        expect(data).toBe('0xmockeddata');
    });
});
