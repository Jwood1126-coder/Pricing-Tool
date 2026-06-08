import Papa from "papaparse";

// CSV parsing via PapaParse. The full parse runs in PapaParse's own worker
// thread (worker: true) so a 100k-row file doesn't freeze the UI.
//
// IMPORTANT: worker mode serializes the config via postMessage, which cannot
// clone functions. So NO function options (transformHeader / beforeFirstChunk /
// transform) may be passed here. BOM handling is therefore done at the byte
// level below instead of via a transformHeader callback.

// Excel on Windows writes a UTF-8 BOM (EF BB BF) at the very start of the file,
// which otherwise glues an invisible character onto the first column name and
// breaks column mapping. Strip it by slicing the first 3 bytes off the Blob —
// O(1), no full read, and worker-safe (no function passed to PapaParse).
export async function bomStripped(file) {
  try {
    const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
    if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
      return file.slice(3);
    }
  } catch {
    /* fall back to the original file if slicing isn't supported */
  }
  return file;
}

// Quick preview: read just the header + a handful of rows so the user can map
// columns before committing to a full parse of a huge file.
export async function previewCSV(file, rowCount = 8) {
  const input = await bomStripped(file);
  return new Promise((resolve, reject) => {
    Papa.parse(input, {
      header: true,
      skipEmptyLines: true,
      preview: rowCount,
      complete: (res) => resolve({ columns: res.meta.fields || [], rows: res.data }),
      error: reject,
    });
  });
}

// Full parse of the whole file into an array of row objects keyed by header.
export async function parseCSV(file, onProgress) {
  const input = await bomStripped(file);
  return new Promise((resolve, reject) => {
    const rows = [];
    Papa.parse(input, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      chunk: (res) => {
        for (const r of res.data) rows.push(r);
        if (onProgress) onProgress(rows.length);
      },
      complete: () => resolve(rows),
      error: reject,
    });
  });
}
