import { pbkdf2, getRandomBytes } from "@railgun-community/wallet";

export { pbkdf2, getRandomBytes };

export interface EncryptionKeyResult {
  encryptionKey: string;
  storageHash: string;
  salt: string;
}

export const generateEncryptionKeyFromPassword = async (
  password: string
): Promise<EncryptionKeyResult> => {
  const salt = getRandomBytes(16);

  const [encryptionKey, storageHash] = await Promise.all([
    pbkdf2(password, salt, 100000),
    pbkdf2(password, salt, 1000000),
  ]);

  return { encryptionKey, storageHash, salt };
};

export const verifyAndGetEncryptionKey = async (
  password: string,
  storedSalt: string,
  storedHash: string
): Promise<string> => {
  const [encryptionKey, calculatedHash] = await Promise.all([
    pbkdf2(password, storedSalt, 100000),
    pbkdf2(password, storedSalt, 1000000),
  ]);

  if (calculatedHash !== storedHash) {
    throw new Error("Invalid password");
  }

  return encryptionKey;
};
