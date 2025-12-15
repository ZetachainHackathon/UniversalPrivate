import { describe, it, expect } from 'vitest';
import { CONFIG } from '@/config/env';

describe('Config Integrity', () => {
    it('should have correct Chain IDs', () => {
        expect(CONFIG.CHAINS.SEPOLIA.ID_DEC).toBe(11155111);
        expect(CONFIG.CHAINS.ZETACHAIN.ID_DEC).toBe(7001);
        expect(CONFIG.CHAINS.BASE_SEPOLIA.ID_DEC).toBe(84532);
    });

    it('should have required contract keys', () => {
        expect(CONFIG.CHAINS.SEPOLIA.EVM_ADAPT).toMatch(/^0x/);
        expect(CONFIG.CHAINS.ZETACHAIN.ZETACHAIN_ADAPT).toMatch(/^0x/);
    });
});
