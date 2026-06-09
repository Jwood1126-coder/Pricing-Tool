import React, { useState, useEffect, useRef } from "react";
import { T, S } from "../styles/tokens.js";
import { DATA_TYPES } from "../data/schema.js";
import { previewCSV, parseCSV } from "../data/parser.js";
import { importDataset, datasetStatus, clearDataset, clearAll } from "../data/store.js";
import ColumnMapper from "./ColumnMapper.jsx";

// Upload / manage the four datasets. Flow per dataset:
// pick file -> preview (header + few rows) -> map columns -> full parse -> import.
//
// NOTE: this uses in-app notices + an inline confirm bar, NOT window.alert /
// window.confirm. Native dialogs in Electron can break keyboard focus for the
// whole window after they're dismissed (inputs stop showing a caret / accepting
// typing), so they must not be used anywhere in the app.
export default function DataManagement({ onDataChanged }) {
  const [status, setStatus] = useState(null);
  const [active, setActive] = useState(null); // { type, file, columns, previewRows }
  const [busy, setBusy] = useState(null); // progress message
  const [notice, setNotice] = useState(null); // { kind: "ok"|"err", text }
  const [confirmAction, setConfirmAction] = useState(null); // { message, run }
  const fileRef = useRef(null);
  const pendingType = useRef(null);

  async function refresh() {
    setStatus(await datasetStatus());
  }
  useEffect(() => { refresh(); }, []);

  function pickFile(type) {
    pendingType.current = type;
    fileRef.current.value = "";
    fileRef.current.click();
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const type = pendingType.current;
    setNotice(null);
    setBusy("Reading file…");
    try {
      const { columns, rows } = await previewCSV(file);
      setActive({ type, file, columns, previewRows: rows });
    } catch (err) {
      setNotice({ kind: "err", text: "Could not read file: " + (err?.message || err) });
    }
    setBusy(null);
  }

  async function handleConfirm(mapping, locationCols) {
    const { type, file } = active;
    setActive(null);
    setNotice(null);
    setBusy("Parsing rows…");
    try {
      const rows = await parseCSV(file, (n) => setBusy(`Parsing… ${n.toLocaleString()} rows`));
      setBusy(`Saving ${rows.length.toLocaleString()} records…`);
      const { saved, dropped } = await importDataset(type, rows, mapping, locationCols, (done, total) =>
        setBusy(`Saving… ${done.toLocaleString()} / ${total.toLocaleString()}`)
      );
      setBusy(null);
      await refresh();
      onDataChanged?.();
      const warn = dropped
        ? ` ⚠ ${dropped.toLocaleString()} of ${rows.length.toLocaleString()} rows were skipped because the required key field (e.g. ${DATA_TYPES[type].fields[0].label}) was empty — check your column mapping.`
        : "";
      setNotice({ kind: dropped ? "err" : "ok", text: `Imported ${saved.toLocaleString()} ${DATA_TYPES[type].label} records.${warn}` });
    } catch (err) {
      setBusy(null);
      setNotice({ kind: "err", text: "Import failed: " + (err?.message || err) });
    }
  }

  function askClear(type) {
    setConfirmAction({
      message: `Clear all ${DATA_TYPES[type].label}? This cannot be undone.`,
      run: async () => { await clearDataset(type); await refresh(); onDataChanged?.(); setNotice({ kind: "ok", text: `Cleared ${DATA_TYPES[type].label}.` }); },
    });
  }

  function askClearAll() {
    setConfirmAction({
      message: "Wipe ALL uploaded data and logs? This cannot be undone.",
      run: async () => { await clearAll(); await refresh(); onDataChanged?.(); setNotice({ kind: "ok", text: "All data and logs cleared." }); },
    });
  }

  async function runConfirm() {
    const action = confirmAction;
    setConfirmAction(null);
    if (action) await action.run();
  }

  if (active) {
    return (
      <ColumnMapper
        type={active.type}
        columns={active.columns}
        previewRows={active.previewRows}
        onConfirm={handleConfirm}
        onCancel={() => setActive(null)}
      />
    );
  }

  return (
    <div style={S.card}>
      <div style={S.head}>
        <span>Data Management</span>
        <button onClick={askClearAll} disabled={!!busy} style={{ background: "rgba(255,255,255,0.15)", color: T.white, border: "1px solid rgba(255,255,255,0.4)", borderRadius: 5, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Clear All Data / Reset</button>
      </div>
      <div style={{ padding: 20 }}>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFile} />

        {busy && (
          <div style={{ background: T.tealLight, border: `1px solid #A5F3FC`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#0E7490", fontWeight: 600, fontSize: 13 }}>{busy}</div>
        )}

        {notice && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: notice.kind === "err" ? T.redLight : T.greenLight, border: `1px solid ${notice.kind === "err" ? "#FCA5A5" : "#6EE7B7"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: notice.kind === "err" ? "#991B1B" : "#065F46", fontSize: 13, fontWeight: 600 }}>
            <span style={{ flex: 1 }}>{notice.text}</span>
            <button onClick={() => setNotice(null)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}>✕</button>
          </div>
        )}

        {confirmAction && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: T.orangeLight, border: "1px solid #FCD34D", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#92400E", fontSize: 13, fontWeight: 600 }}>
            <span style={{ flex: 1 }}>{confirmAction.message}</span>
            <button onClick={runConfirm} style={{ ...S.btn, background: T.red, padding: "5px 14px", fontSize: 12 }}>Yes, do it</button>
            <button onClick={() => setConfirmAction(null)} style={{ ...S.btnO, padding: "5px 14px", fontSize: 12 }}>Cancel</button>
          </div>
        )}

        <div style={{ fontSize: 12, color: T.slate, marginBottom: 16 }}>
          Upload a CSV for each dataset. You'll map your file's columns to the required fields before import. Re-uploading replaces that dataset.
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {Object.entries(DATA_TYPES).map(([type, def]) => {
            const s = status?.[type];
            return (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 16, border: `1px solid ${T.lgray}`, borderRadius: 8, padding: "14px 16px", background: s?.count ? T.white : T.offwhite }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{def.label}</div>
                  <div style={{ fontSize: 11, color: T.slate, marginTop: 2 }}>
                    {s?.count ? (
                      <>{s.count.toLocaleString()} records · last upload {new Date(s.lastUpload).toLocaleString()}</>
                    ) : (
                      <span style={{ color: T.orange }}>No data loaded</span>
                    )}
                  </div>
                </div>
                <button style={S.btn} disabled={!!busy} onClick={() => pickFile(type)}>{s?.count ? "Re-upload" : "Upload CSV"}</button>
                {s?.count > 0 && <button style={{ ...S.btnO, color: T.red, borderColor: T.red }} disabled={!!busy} onClick={() => askClear(type)}>Clear</button>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
