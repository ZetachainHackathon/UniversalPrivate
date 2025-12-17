import { ArtifactStore } from "@railgun-community/wallet";
import fs from "fs";
import path from "path";

const createDownloadDirPath = (documentsDir: string, pathStr: string) => {
  return path.join(documentsDir, pathStr);
};

export const createNodeArtifactStore = (documentsDir: string): ArtifactStore => {
  const get = async (pathStr: string) => {
    return fs.promises.readFile(createDownloadDirPath(documentsDir, pathStr));
  };

  const store = async (
    dir: string,
    pathStr: string,
    item: string | Uint8Array
  ) => {
    await fs.promises.mkdir(createDownloadDirPath(documentsDir, dir), {
      recursive: true,
    });
    // @ts-ignore
    await fs.promises.writeFile(createDownloadDirPath(documentsDir, pathStr), item);
  };

  const exists = (pathStr: string) => {
    return fs.promises
      .access(createDownloadDirPath(documentsDir, pathStr))
      .then(() => true)
      .catch(() => false);
  };

  return new ArtifactStore(
    get,
    store,
    exists,
  );
};
