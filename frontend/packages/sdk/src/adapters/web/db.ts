import LevelDB from "level-js";

/**
 * Creates a new web database instance at the specified location path
 * @param dbLocationPath - The file system path where the database will be created
 * @returns A new LevelDB database instance
 * * @remarks 
 * 這是專門給瀏覽器使用的資料庫實作 (基於 IndexedDB)。
 */
export const createWebDatabase = (dbLocationPath: string) => {
  console.log("Creating local database (IndexedDB) at path: ", dbLocationPath);
  
  // 初始化 level-js
  const db = new LevelDB(dbLocationPath);
  
  return db;
};

/**
 * 清除指定的 IndexedDB 資料庫
 * @param dbName 資料庫名稱
 */
export const clearWebDatabase = async (dbName: string) => {
  console.log(`🗑️ 正在清除 IndexedDB: ${dbName}`);
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => {
      console.log(`✅ IndexedDB ${dbName} 已清除`);
      resolve();
    };
    req.onerror = (event) => {
      console.error(`❌ 清除 IndexedDB ${dbName} 失敗`, event);
      reject(event);
    };
    req.onblocked = () => {
      console.warn(`⚠️ 清除 IndexedDB ${dbName} 被阻塞 (可能有其他分頁開啟中)`);
    };
  });
};
