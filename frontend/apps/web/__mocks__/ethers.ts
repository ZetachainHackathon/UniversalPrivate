import { vi } from 'vitest';

export const mockPopulateTransaction = vi.fn().mockResolvedValue({ to: '0xtarget', data: '0xcalldata' });
export const mockContractFunction = vi.fn().mockResolvedValue({ hash: '0xmockhash', wait: vi.fn().mockResolvedValue({}) });

// Mock Class
export class Contract {
    constructor() { }
    get transfer() { return { populateTransaction: mockPopulateTransaction }; }
    get withdraw() { return { populateTransaction: mockPopulateTransaction }; }
    getFunction() { return mockContractFunction; }
}

export const ZeroAddress = '0x0000000000000000000000000000000000000000';
export const parseUnits = vi.fn((val) => BigInt(val) * 1000000000000000000n);
