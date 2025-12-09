// apps/web/lib/railgun/artifact-store.ts
import { ArtifactStore } from '@railgun-community/wallet';

/**
 * 建立一個瀏覽器專用的 Artifact Store
 * 目前實作：RAM Only (暫不儲存到硬碟，每次重整都會重新下載電路檔)
 */
export const createWebArtifactStore = (): ArtifactStore => {
  
  // 1. 讀取檔案
  // ❌ 錯誤寫法: return undefined;
  // ✅ 正確寫法: return null; (SDK 規定找不到檔案要回傳 null)
  const getFile = async (path: string) => {
    return null; 
  };

  // 2. 儲存檔案：什麼都不做 (No-Op)
  const storeFile = async (
    dir: string,
    path: string,
    item: string | Uint8Array
  ) => {
    // 這裡留空
  };

  // 3. 檢查檔案是否存在：永遠回傳 false
  const fileExists = async (path: string) => {
    return false;
  };

  return new ArtifactStore(getFile, storeFile, fileExists);
};