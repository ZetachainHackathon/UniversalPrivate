// apps/web/lib/railgun/db.ts
import LevelDB from "level-js";

/**
 * Creates a new web database instance at the specified location path
 * @param dbLocationPath - The file system path where the database will be created
 * @returns A new LevelDB database instance
 * * @remarks 
 * 這是專門給瀏覽器使用的資料庫實作 (基於 IndexedDB)。
 * 在 Next.js 中，這只會由 Client Component 呼叫。
 */
export const createWebDatabase = (dbLocationPath: string) => {
  console.log("Creating local database (IndexedDB) at path: ", dbLocationPath);
  
  // 初始化 level-js
  const db = new LevelDB(dbLocationPath);
  
  return db;
};