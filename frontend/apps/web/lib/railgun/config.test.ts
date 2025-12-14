import { describe, it, expect } from 'vitest';
import { CONFIG } from '@/config/env';

describe('Config Integrity', () => {
    it('should have correct Chain IDs', () => {
        expect(CONFIG.CHAINS.SEPOLIA.ID_DEC).toBe(11155111);
        expect(CONFIG.CHAINS.ZETACHAIN.ID_DEC).toBe(7001);
    });

    it('should have required contract keys', () => {
        expect(CONFIG.CONTRACTS.DEFAULT_ADAPT).toMatch(/^0x/);
        expect(CONFIG.CONTRACTS.ZETACHAIN_ADAPT).toMatch(/^0x/);
    });
});
