import { parseNumeric, parseQty } from "../utils/format.js";

// The CONTRACT. Every uploaded file is normalized to these canonical shapes.
// The column mapper maps source columns TO these target fields. Everything
// downstream (pricing, history, export) reads only the canonical shape.

// Each data type lists the target fields the user must map their columns to.
// `key`     -> property name on the canonical record
// `label`   -> shown in the mapping UI
// `required`-> upload is blocked until this field is mapped
//
// Parts are special: in addition to the scalar fields, the user marks a SET of
// columns as inventory-by-location. Each marked column becomes a location whose
// code is the column's header. This is handled separately in the mapper.

export const DATA_TYPES = {
  parts: {
    label: "Parts",
    storeName: "parts",
    keyField: "partNum",
    hasLocations: true,
    fields: [
      { key: "partNum", label: "Part Number", required: true },
      { key: "desc", label: "Description", required: false },
      { key: "avgCost", label: "Average Cost", required: false, numeric: true },
      { key: "repCost", label: "Replacement Cost", required: false, numeric: true },
    ],
  },
  customers: {
    label: "Customers",
    storeName: "customers",
    keyField: "customerNum",
    hasLocations: false,
    fields: [
      { key: "customerNum", label: "Customer Number", required: true },
      { key: "name", label: "Customer Name", required: true },
    ],
  },
  users: {
    label: "Users",
    storeName: "users",
    keyField: "id",
    hasLocations: false,
    fields: [
      { key: "name", label: "Full Name", required: true },
      { key: "title", label: "Title", required: false },
      { key: "role", label: "Role (admin or rep)", required: false },
      { key: "initials", label: "Initials", required: false },
    ],
  },
  competitors: {
    label: "Competitors",
    storeName: "competitors",
    keyField: "name",
    hasLocations: false,
    fields: [{ key: "name", label: "Competitor Name", required: true }],
  },
};

export const DEFAULT_SETTINGS = {
  floorMargin: 0.4, // 40% floor
  dailyLimit: 100,
  bulkLimit: 25,
};

// Normalize one raw parsed row -> canonical record, using a mapping object
// of { canonicalKey: sourceColumnName } plus (for parts) locationCols: [names].
export function normalizeRow(type, row, mapping, locationCols = []) {
  const def = DATA_TYPES[type];
  const rec = {};

  for (const f of def.fields) {
    const src = mapping[f.key];
    let val = src ? row[src] : "";
    if (val === undefined || val === null) val = "";
    if (f.numeric) {
      // Tolerate "$1,234.56" etc. null = missing (distinct from a real 0).
      val = parseNumeric(val);
    } else {
      val = typeof val === "string" ? val.trim() : val;
    }
    rec[f.key] = val;
  }

  if (def.hasLocations) {
    const inventory = {};
    for (const col of locationCols) {
      const code = col.trim();
      // Tolerate thousands separators in on-hand quantities ("10,000" -> 10000).
      inventory[code] = parseQty(row[col]) ?? 0;
    }
    rec.inventory = inventory;
  }

  // Part numbers are looked up case-insensitively (getPart upper-cases the key),
  // so store the key upper-cased to match.
  if (type === "parts") rec.partNum = String(rec.partNum).toUpperCase();

  // Derive an id for users if not supplied (login keys off id).
  if (type === "users") {
    rec.role = String(rec.role || "rep").toLowerCase().includes("admin") ? "admin" : "rep";
    rec.initials = rec.initials || rec.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    rec.id = rec.initials.toLowerCase() + "-" + rec.name.toLowerCase().replace(/\s+/g, "");
  }

  return rec;
}
