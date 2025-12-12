import { ArtifactStore } from '@railgun-community/wallet';
import brotliPromise from 'brotli-wasm';
import { Buffer } from 'buffer'; // 🔥 1. 必須引入這個

export const createWebArtifactStore = (): ArtifactStore => {
  
  const getFile = async (path: string) => {
    try {
      let url = "";

      // 1. 路徑匹配邏輯 (維持不變)
      const match = path.match(/(\d+)x(\d+)/);
      if (match) {
        const n = parseInt(match[1]!);
        const c = parseInt(match[2]!);
        const folder = `${n.toString().padStart(2, '0')}x${c.toString().padStart(2, '0')}`;

        if (path.includes("vkey")) url = `/test-artifacts/${folder}/vkey.json`;
        else if (path.includes("zkey")) url = `/test-artifacts/${folder}/zkey.br`;
        else if (path.includes("wasm")) url = `/test-artifacts/${folder}/wasm.br`;
      } 
      else if (path.includes("cross_contract_calls")) {
         if (path.includes("vkey")) url = `/test-artifacts/cross_contract/vkey.json`;
         else if (path.includes("zkey")) url = `/test-artifacts/cross_contract/zkey.br`;
         else if (path.includes("wasm")) url = `/test-artifacts/cross_contract/wasm.br`;
      }
      else {
         url = `/test-artifacts/${path}`;
      }

      if (!url) return null;

      // 2. 下載邏輯
      const response = await fetch(url);
      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();

      // 3. 解壓縮與型別轉換
      if (url.endsWith(".br")) {
        try {
          const brotli = await brotliPromise;
          const decompressed = brotli.decompress(new Uint8Array(arrayBuffer));
          
          // 🔥 2. 關鍵修改：將 Uint8Array 轉為 Buffer
          return Buffer.from(decompressed); 
          
        } catch (e) {
          console.error("❌ Brotli 解壓縮失敗:", e);
          // 失敗時也轉為 Buffer
          return Buffer.from(arrayBuffer);
        }
      }

      // 🔥 3. 關鍵修改：普通檔案也要轉為 Buffer
      return Buffer.from(arrayBuffer);

    } catch (err) {
      console.error("❌ Artifact 下載錯誤:", path, err);
      return null;
    }
  };

  const storeFile = async () => {};
  const fileExists = async () => false;

  return new ArtifactStore(getFile, storeFile, fileExists);
};