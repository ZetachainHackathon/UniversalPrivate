import { ArtifactStore } from '@railgun-community/wallet';
import brotliPromise from 'brotli-wasm';
import { Buffer } from 'buffer'; 

export const createWebArtifactStore = (): ArtifactStore => {
  
  const get = async (path: string) => {
    try {
      let url = "";

      // 1. 路徑匹配邏輯
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
          
          return Buffer.from(decompressed); 
          
        } catch (e) {
          console.error("❌ Brotli 解壓縮失敗:", e);
          // 失敗時也轉為 Buffer
          return Buffer.from(arrayBuffer);
        }
      }

      return Buffer.from(arrayBuffer);

    } catch (err) {
      console.error("❌ 下載 Artifact 失敗:", path, err);
      return null;
    }
  };

  const store = async (
    dir: string,
    path: string,
    item: string | Uint8Array,
  ) => {
      // Web 端通常不需要實作 storeFile，因為是唯讀的
      // 或者可以實作寫入 IndexedDB
      console.warn("storeFile not implemented for WebArtifactStore");
      return Promise.resolve();
  };

  const exists = async (path: string) => {
      // 簡單檢查，實際可能需要 HEAD request
      return Promise.resolve(false); 
  }

  return new ArtifactStore(
    get,
    store,
    exists,
  );
};
