
export const STORAGE_KEYS = {
    RAILGUN_WALLET_ID: "railgun_wallet_id",
    RAILGUN_HASH_STORE: "railgun_hash_store",
    RAILGUN_SALT: "railgun_salt",
} as const;

export const BrowserStorage = {
    set: (key: string, value: string) => {
        if (typeof window !== "undefined") {
            localStorage.setItem(key, value);
        }
    },
    get: (key: string): string | null => {
        if (typeof window !== "undefined") {
            return localStorage.getItem(key);
        }
        return null;
    },
    remove: (key: string) => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(key);
        }
    }
};
