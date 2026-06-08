import Papa from "papaparse";

// CSV parsing via PapaParse. Parsing runs in PapaParse's own worker thread
// (worker: true) so a 100k-row file doesn't freeze the UI.

// Strip a UTF-8 BOM and surrounding whitespace from header names. Excel on
// Windows exports CSVs with a BOM, which otherwise glues an invisible char onto
// the first column name and breaks column mapping. Applied to both column list
// and row keys so they stay consistent.
const cleanHeader = (h) => h.replace(/^﻿/, "").trim();

// Quick preview: read just the header + a handful of rows so the user can map
// columns before committing to a full parse of a huge file.
export function previewCSV(file, rowCount = 8) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: rowCount,
      transformHeader: cleanHeader,
      complete: (res) => {
        const columns = res.meta.fields || [];
        resolve({ columns, rows: res.data });
      },
      error: reject,
    });
  });
}

// Full parse of the whole file into an array of row objects keyed by header.
export function parseCSV(file, onProgress) {
  return new Promise((resolve, reject) => {
    const rows = [];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      transformHeader: cleanHeader,
      chunk: (res) => {
        for (const r of res.data) rows.push(r);
        if (onProgress) onProgress(rows.length);
      },
      complete: () => resolve(rows),
      error: reject,
    });
  });
}
