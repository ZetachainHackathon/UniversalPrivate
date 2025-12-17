import LevelDownDB from "leveldown";

/**
 * Creates a LevelDown database instance at the specified path.
 *
 * @param dbLocationPath - The file system path where the database will be created
 * @returns A LevelDown database instance
 */
export const createNodeDatabase = (dbLocationPath: string) => {
  console.log("Creating local database at path: ", dbLocationPath);
  // @ts-ignore
  const db = LevelDownDB(dbLocationPath);
  return db;
};
