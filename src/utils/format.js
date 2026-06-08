// Formatting + CSV helpers.

export function fmtSell(n) {
  return `$${Number(n).toFixed(4)}`;
}

// Escape a single value for CSV output (RFC 4180).
// FIX: the original csvSafe stripped every hyphen, mangling part numbers like
// "BRN-4820-SS" into "BRN4820SS". We now preserve the text and only quote/escape
// when needed (fields containing a comma, quote, or newline get wrapped in
// double quotes with embedded quotes doubled).
export function csvSafe(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Build a CSV string from a header array and an array of row arrays.
// Every cell is passed through csvSafe. A UTF-8 BOM can be prepended by the caller.
export function toCSV(header, rows) {
  const lines = [header.map(csvSafe).join(",")];
  for (const row of rows) lines.push(row.map(csvSafe).join(","));
  return lines.join("\n");
}

// Parse a numeric value from a CSV cell, tolerating real-world formatting:
// currency symbols ("$1,234.56"), thousands separators, and whitespace.
// Returns null for blank/unparseable input (NOT 0) so callers can tell a real
// zero apart from "missing". Assumes US formatting (',' = thousands, '.' = decimal).
export function parseNumeric(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Parse an integer quantity, tolerating commas/whitespace/unit suffixes
// ("1,000", " 500 ", "500 ea"). Returns null when there is no leading integer.
export function parseQty(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : null;
  const cleaned = String(value).replace(/,/g, "").trim();
  const m = cleaned.match(/^-?\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}
