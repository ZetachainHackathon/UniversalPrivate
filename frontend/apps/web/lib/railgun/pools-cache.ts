import type { PoolInfo } from "./uniswap-pools";

interface CachedPools {
    pools: PoolInfo[];
    timestamp: number;
    chainId: number;
}

// 快取過期時間：5 分鐘
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// 記憶體快取（用於當前會話）
const memoryCache = new Map<string, CachedPools>();

// LocalStorage 鍵名
const STORAGE_KEY_PREFIX = "uniswap_pools_cache_";

/**
 * 獲取快取鍵（基於鏈 ID）
 */
const getCacheKey = (chainId: number): string => {
    return `${STORAGE_KEY_PREFIX}${chainId}`;
};

/**
 * 從 LocalStorage 讀取快取
 */
const getCachedPoolsFromStorage = (chainId: number): CachedPools | null => {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const key = getCacheKey(chainId);
        const cached = localStorage.getItem(key);
        if (!cached) {
            return null;
        }

        const parsed: CachedPools = JSON.parse(cached);
        
        // 檢查是否過期
        const now = Date.now();
        if (now - parsed.timestamp > CACHE_EXPIRY_MS) {
            localStorage.removeItem(key);
            return null;
        }

        return parsed;
    } catch (error) {
        console.warn("Failed to read pools cache from storage:", error);
        return null;
    }
};

/**
 * 保存快取到 LocalStorage
 */
const setCachedPoolsToStorage = (chainId: number, pools: PoolInfo[]): void => {
    if (typeof window === "undefined") {
        return;
    }

    try {
        const key = getCacheKey(chainId);
        const cached: CachedPools = {
            pools,
            timestamp: Date.now(),
            chainId,
        };
        localStorage.setItem(key, JSON.stringify(cached));
    } catch (error) {
        console.warn("Failed to save pools cache to storage:", error);
    }
};

/**
 * 獲取快取的池子列表
 */
export const getCachedPools = (chainId: number): PoolInfo[] | null => {
    // 1. 先檢查記憶體快取
    const memoryKey = chainId.toString();
    const memoryCached = memoryCache.get(memoryKey);
    if (memoryCached) {
        const now = Date.now();
        if (now - memoryCached.timestamp <= CACHE_EXPIRY_MS) {
            return memoryCached.pools;
        } else {
            // 記憶體快取過期，清除
            memoryCache.delete(memoryKey);
        }
    }

    // 2. 檢查 LocalStorage 快取
    const storageCached = getCachedPoolsFromStorage(chainId);
    if (storageCached) {
        // 同時更新記憶體快取
        memoryCache.set(memoryKey, storageCached);
        return storageCached.pools;
    }

    return null;
};

/**
 * 設置快取的池子列表
 */
export const setCachedPools = (chainId: number, pools: PoolInfo[]): void => {
    const memoryKey = chainId.toString();
    const cached: CachedPools = {
        pools,
        timestamp: Date.now(),
        chainId,
    };

    // 同時更新記憶體和 LocalStorage
    memoryCache.set(memoryKey, cached);
    setCachedPoolsToStorage(chainId, pools);
};

/**
 * 清除指定鏈的快取
 */
export const clearCachedPools = (chainId: number): void => {
    const memoryKey = chainId.toString();
    memoryCache.delete(memoryKey);

    if (typeof window !== "undefined") {
        try {
            const key = getCacheKey(chainId);
            localStorage.removeItem(key);
        } catch (error) {
            console.warn("Failed to clear pools cache from storage:", error);
        }
    }
};

/**
 * 清除所有快取
 */
export const clearAllCachedPools = (): void => {
    memoryCache.clear();

    if (typeof window !== "undefined") {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach((key) => {
                if (key.startsWith(STORAGE_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn("Failed to clear all pools cache from storage:", error);
        }
    }
};

