import { toCSV } from "./format.js";

// Trigger a browser download of a CSV file. Prepends a UTF-8 BOM so Excel
// opens it with correct encoding.
export function downloadCSV(filename, header, rows) {
  const BOM = "﻿";
  const csv = toCSV(header, rows);
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}
