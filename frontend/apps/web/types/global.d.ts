
interface EIP1193Provider {
    request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
    on: (eventName: string, handler: (...args: unknown[]) => void) => void;
    removeListener: (eventName: string, handler: (...args: unknown[]) => void) => void;
    check_status?: () => Promise<void>;
}

declare global {
    interface Window {
        ethereum?: EIP1193Provider;
    }
}

export { };
