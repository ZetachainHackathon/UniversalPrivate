import { pbkdf2, getRandomBytes } from "@railgun-community/wallet";
import { BrowserStorage, STORAGE_KEYS } from "@/lib/storage";
// ------------------------------------------------------------------
// 1. 基礎 Hash 服務 (Hash Service)
// ------------------------------------------------------------------

type HashPasswordString = {
  secret: string;
  salt: string;
  iterations: number;
};

export const hashPasswordString = async ({
  secret,
  salt,
  iterations,
}: HashPasswordString): Promise<string> => {
  // Railgun SDK 的 pbkdf2 回傳 Promise<string>
  return pbkdf2(secret, salt, iterations);
};

// ------------------------------------------------------------------
// 2. 資料儲存層 (Storage Layer) - 改用 localStorage
// ------------------------------------------------------------------

/**
 * 儲存資料到瀏覽器的 localStorage
 */
export const storeData = async (key: string, data: any): Promise<void> => {
  if (typeof window === "undefined") return; // 防止在 Server 端執行報錯
  BrowserStorage.set(key, JSON.stringify({ data }));
};

/**
 * 從瀏覽器的 localStorage 讀取資料
 */
export const getData = async (key: string): Promise<any> => {
  if (typeof window === "undefined") return null;
  const item = BrowserStorage.get(key);
  if (!item) throw new Error(`Data not found for key: ${key}`);
  return JSON.parse(item).data;
};

// ------------------------------------------------------------------
// 3. 加密與驗證邏輯 (Encryption Logic)
// ------------------------------------------------------------------

/**
 * 設定並儲存加密金鑰 (註冊/設定密碼時使用)
 * 流程：
 * 1. 產生隨機 Salt
 * 2. 用 Salt + 密碼 (10萬次運算) -> 產生真正的 Encryption Key (用於解鎖錢包)
 * 3. 用 Salt + 密碼 (100萬次運算) -> 產生 Storage Hash (用於驗證密碼是否正確)
 * 4. 將 Salt 和 Storage Hash 存入 localStorage
 */
export const setEncryptionKeyFromPassword = async (
  password: string
): Promise<string> => {
  // 1. 產生隨機 Salt (已經是 Hex 字串格式)
  const saltHex = getRandomBytes(16);

  const [encryptionKey, hashPasswordStored] = await Promise.all([
    // 產生加密金鑰 (給 Railgun Engine 用)
    hashPasswordString({ secret: password, salt: saltHex, iterations: 100000 }),
    // 產生儲存用的 Hash (驗證密碼用，迭代次數更多更安全)
    hashPasswordString({ secret: password, salt: saltHex, iterations: 1000000 }),
  ]);

  // 存入 localStorage
  await storeData(STORAGE_KEYS.RAILGUN_HASH_STORE, hashPasswordStored);
  await storeData(STORAGE_KEYS.RAILGUN_SALT, saltHex);

  return encryptionKey;
};

/**
 * 驗證密碼並取得加密金鑰 (登入時使用)
 */
export const getEncryptionKeyFromPassword = async (
  password: string
): Promise<string> => {
  // 1. 從 localStorage 讀取 Salt 和 驗證 Hash
  let storedPasswordHash: string;
  let storedSalt: string;

  try {
    [storedPasswordHash, storedSalt] = await Promise.all([
      getData(STORAGE_KEYS.RAILGUN_HASH_STORE),
      getData(STORAGE_KEYS.RAILGUN_SALT),
    ]);
  } catch (e) {
    throw new Error("找不到儲存的密碼資料，請先設定密碼。");
  }

  console.log("🔍 讀取到的 Salt:", storedSalt);

  // 2. 重新計算 Hash
  const [encryptionKey, hashPassword] = await Promise.all([
    hashPasswordString({
      secret: password,
      salt: storedSalt,
      iterations: 100000,
    }),
    hashPasswordString({
      secret: password,
      salt: storedSalt,
      iterations: 1000000,
    }),
  ]);

  // 3. 比對計算出來的 Hash 與儲存的 Hash 是否一致
  if (storedPasswordHash !== hashPassword) {
    throw new Error("密碼錯誤！");
  }

  return encryptionKey;
};