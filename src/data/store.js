import * as db from "./db.js";
import { DATA_TYPES, DEFAULT_SETTINGS, normalizeRow } from "./schema.js";

// High-level data API the UI talks to. The single seam between the app and the
// backing store — swapping IndexedDB for NetSuite later is a change to this file.

// ---- Datasets (upload) -----------------------------------------------------

// Normalize parsed rows and replace the store for `type`. For parts, also derive
// and persist the location list from the columns the user marked as inventory.
export async function importDataset(type, rows, mapping, locationCols, onProgress) {
  const def = DATA_TYPES[type];
  const records = rows
    .map((r) => normalizeRow(type, r, mapping, locationCols))
    .filter((r) => r[def.keyField] !== "" && r[def.keyField] !== undefined && r[def.keyField] !== null);

  const dropped = rows.length - records.length;

  await db.replaceStore(def.storeName, records, onProgress);

  if (def.hasLocations) {
    const locations = (locationCols || []).map((c) => c.trim()).filter(Boolean);
    await db.metaSet("locations", locations);
  }

  const meta = (await db.metaGet("lastUpload")) || {};
  meta[type] = { date: new Date().toISOString(), count: records.length };
  await db.metaSet("lastUpload", meta);

  // Report saved vs dropped so the UI can warn about empty/unmapped key rows.
  return { saved: records.length, dropped };
}

export async function datasetStatus() {
  const lastUpload = (await db.metaGet("lastUpload")) || {};
  const out = {};
  for (const [type, def] of Object.entries(DATA_TYPES)) {
    out[type] = {
      count: await db.countStore(def.storeName),
      lastUpload: lastUpload[type]?.date || null,
    };
  }
  return out;
}

export async function clearDataset(type) {
  await db.clearStore(DATA_TYPES[type].storeName);
  const meta = (await db.metaGet("lastUpload")) || {};
  delete meta[type];
  await db.metaSet("lastUpload", meta);
}

// ---- Parts -----------------------------------------------------------------

export async function getPart(partNum) {
  return db.getOne("parts", String(partNum).trim().toUpperCase());
}

export async function getParts(partNums) {
  const keys = partNums.map((p) => String(p).trim().toUpperCase());
  return db.getMany("parts", keys);
}

// ---- Customers / users / competitors / locations ---------------------------

export async function getAllCustomers() {
  return db.getAll("customers");
}

// Customer autocomplete search — the NetSuite seam. Today it scans the local
// IndexedDB store with a cursor and stops after `limit` matches, so we never
// load all customers into memory (works with very large customer sets).
// For NetSuite, replace the body with a Suitelet entityid/companyname search.
export async function searchCustomers(query, limit = 8) {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const dbi = await db.getDB();
  let cursor = await dbi.transaction("customers").store.openCursor();
  const out = [];
  while (cursor && out.length < limit) {
    const c = cursor.value;
    if (c.customerNum?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q)) out.push(c);
    cursor = await cursor.continue();
  }
  return out;
}

export async function getUsers() {
  return db.getAll("users");
}

export async function getCompetitors() {
  const list = await db.getAll("competitors");
  return list.map((c) => c.name);
}

export async function getLocations() {
  return (await db.metaGet("locations")) || [];
}

// ---- Settings --------------------------------------------------------------

export async function getSettings() {
  const saved = (await db.metaGet("settings")) || {};
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings) {
  await db.metaSet("settings", settings);
}

// ---- Log (audit / session) -------------------------------------------------

export async function appendLog(entries) {
  const arr = Array.isArray(entries) ? entries : [entries];
  const dbi = await db.getDB();
  const tx = dbi.transaction("log", "readwrite");
  await Promise.all(arr.map((e) => tx.store.put(e)));
  await tx.done;
}

export async function getLog() {
  return db.getAll("log");
}

export async function clearLog() {
  return db.clearStore("log");
}

// ---- Reset -----------------------------------------------------------------

export async function clearAll() {
  await db.wipeAll();
}
