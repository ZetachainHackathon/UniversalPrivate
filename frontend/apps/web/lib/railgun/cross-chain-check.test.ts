import { describe, it, expect, vi } from 'vitest';
import { executeCrossChainTransferFromEvm } from './cross-chain-transfer';
import { CONFIG } from '@/config/env';

// Mock SDK
vi.mock('@repo/sdk', () => ({
    executeCrossChainTransferFromEvm: vi.fn().mockResolvedValue({ hash: '0xhash' }),
}));

import { executeCrossChainTransferFromEvm as mockSdkExecute } from '@repo/sdk';

vi.mock('./encryption', () => ({
    getEncryptionKeyFromPassword: vi.fn().mockResolvedValue('mockKey'),
}));

describe('Cross-Chain Transfer Logic', () => {
    it('should call SDK with correct fee-adjusted amount', async () => {
        const password = '123';
        const railgunWalletId = 'id';
        const amount = 1000000n; // 1000000 units
        const recipient = '0x123';
        const signer = { provider: {} } as any;
        const sourceChain = 'SEPOLIA';
        const targetChain = 'sepolia'; 
        const tokenAddress = CONFIG.TOKENS.ETH_SEPOLIA.address;

        await executeCrossChainTransferFromEvm(railgunWalletId, recipient, amount, tokenAddress, password, signer, sourceChain, targetChain);

        // Validation: Check Fee Calculation
        const feeBps = CONFIG.FEES.UNSHIELD_BASIS_POINTS;
        // Calculation: 1000000 * (10000 - 25) / 10000 = 1000000 * 9975 / 10000 = 997500
        const expectedAmount = 997500n;

        expect(mockSdkExecute).toHaveBeenCalledWith(
            expect.anything(), // network
            expect.anything(), // zetachainAdapt
            railgunWalletId,
            'mockKey',
            amount,            // Gross Amount
            expectedAmount,    // Net Amount (Transfer Amount)
            tokenAddress,
            expect.anything(), // targetZrc20
            recipient,
            signer,
            expect.anything() // evmAdapt
        );
    });
});

