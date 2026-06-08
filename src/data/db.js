import { openDB } from "idb";

// IndexedDB is the persistence layer (localStorage caps at ~5-10MB and writes
// synchronously — unusable for 100k+ parts). Parts live in a keyed object store
// so a single lookup is an O(1) get and we never load all 100k into memory.

const DB_NAME = "brennan-pricing-tool";
const DB_VERSION = 1;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("parts", { keyPath: "partNum" });
        db.createObjectStore("customers", { keyPath: "customerNum" });
        db.createObjectStore("users", { keyPath: "id" });
        db.createObjectStore("competitors", { keyPath: "name" });
        db.createObjectStore("log", { keyPath: "id" });
        db.createObjectStore("meta"); // key-value: settings, locations, lastUpload, etc.
      },
    });
  }
  return dbPromise;
}

// Replace an entire store with new records, written in chunked transactions so a
// 100k-row import doesn't build one giant transaction. Reports progress.
export async function replaceStore(storeName, records, onProgress) {
  const db = await getDB();
  await db.clear(storeName);

  const CHUNK = 5000;
  for (let i = 0; i < records.length; i += CHUNK) {
    const tx = db.transaction(storeName, "readwrite");
    const slice = records.slice(i, i + CHUNK);
    await Promise.all(slice.map((r) => tx.store.put(r)));
    await tx.done;
    if (onProgress) onProgress(Math.min(i + CHUNK, records.length), records.length);
  }
}

export async function getOne(storeName, key) {
  return (await getDB()).get(storeName, key);
}

export async function getMany(storeName, keys) {
  const db = await getDB();
  const tx = db.transaction(storeName, "readonly");
  const out = await Promise.all(keys.map((k) => tx.store.get(k)));
  await tx.done;
  return out;
}

export async function getAll(storeName) {
  return (await getDB()).getAll(storeName);
}

export async function countStore(storeName) {
  return (await getDB()).count(storeName);
}

export async function putRecord(storeName, record) {
  return (await getDB()).put(storeName, record);
}

export async function clearStore(storeName) {
  return (await getDB()).clear(storeName);
}

export async function metaGet(key) {
  return (await getDB()).get("meta", key);
}

export async function metaSet(key, value) {
  return (await getDB()).put("meta", value, key);
}

// Wipe everything (the "Clear All Data / Reset" action).
export async function wipeAll() {
  const db = await getDB();
  for (const name of ["parts", "customers", "users", "competitors", "log", "meta"]) {
    await db.clear(name);
  }
}
