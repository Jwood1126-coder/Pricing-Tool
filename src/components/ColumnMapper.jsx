import React, { useState } from "react";
import { T, S } from "../styles/tokens.js";
import { DATA_TYPES } from "../data/schema.js";

// Manual column mapping. The user maps each canonical field to one of their
// file's columns. For parts, they additionally tick which columns hold
// inventory-by-location (each ticked column becomes a location named by its header).
export default function ColumnMapper({ type, columns, previewRows, onConfirm, onCancel }) {
  const def = DATA_TYPES[type];
  const [mapping, setMapping] = useState({});
  const [locationCols, setLocationCols] = useState([]);

  const setField = (key, col) => setMapping((m) => ({ ...m, [key]: col }));
  const toggleLoc = (col) =>
    setLocationCols((cur) => (cur.includes(col) ? cur.filter((c) => c !== col) : [...cur, col]));

  const missingRequired = def.fields.filter((f) => f.required && !mapping[f.key]);
  const mappedCols = new Set(Object.values(mapping).filter(Boolean));
  const canConfirm = missingRequired.length === 0;

  return (
    <div style={S.card}>
      <div style={S.head}>
        <span>Map Columns — {def.label}</span>
        <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.15)", color: T.white, border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 12, color: T.slate, marginBottom: 16 }}>
          Detected <strong>{columns.length}</strong> columns. Match each required field to a column from your file.
        </div>

        {/* Field mapping */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          {def.fields.map((f) => (
            <div key={f.key}>
              <label style={S.lbl}>{f.label} {f.required && <span style={{ color: T.red }}>*</span>}</label>
              <select value={mapping[f.key] || ""} onChange={(e) => setField(f.key, e.target.value)}
                style={{ ...S.input, borderColor: f.required && !mapping[f.key] ? T.red : T.lgray, cursor: "pointer" }}>
                <option value="">- Not mapped -</option>
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Location columns (parts only) */}
        {def.hasLocations && (
          <div style={{ background: T.offwhite, borderRadius: 8, padding: "14px 16px", marginBottom: 18 }}>
            <label style={S.lbl}>Inventory / Location Columns</label>
            <div style={{ fontSize: 11, color: T.slate, marginBottom: 10 }}>
              Tick every column that holds on-hand quantity for a location. Each becomes a location named by its column header.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {columns.filter((c) => !mappedCols.has(c)).map((c) => (
                <label key={c} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, border: `1.5px solid ${locationCols.includes(c) ? T.teal : T.lgray}`, background: locationCols.includes(c) ? T.tealLight : T.white, color: locationCols.includes(c) ? T.teal : T.slate }}>
                  <input type="checkbox" checked={locationCols.includes(c)} onChange={() => toggleLoc(c)} style={{ cursor: "pointer" }} />
                  {c}
                </label>
              ))}
            </div>
            {locationCols.length > 0 && <div style={{ fontSize: 11, color: T.teal, marginTop: 10, fontWeight: 600 }}>{locationCols.length} location column{locationCols.length === 1 ? "" : "s"} selected</div>}
          </div>
        )}

        {/* Preview */}
        {previewRows?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>File Preview (first {previewRows.length} rows)</div>
            <div style={{ overflowX: "auto", border: `1px solid ${T.lgray}`, borderRadius: 8 }}>
              <table style={{ borderCollapse: "collapse", fontSize: 11, whiteSpace: "nowrap" }}>
                <thead>
                  <tr style={{ background: T.offwhite }}>
                    {columns.map((c) => <th key={c} style={{ padding: "6px 10px", textAlign: "left", color: T.navyMid, fontWeight: 700, borderBottom: `2px solid ${T.lgray}` }}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.lgray}` }}>
                      {columns.map((c) => <td key={c} style={{ padding: "5px 10px", color: T.slate }}>{row[c]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {missingRequired.length > 0 && (
          <div style={{ background: T.redLight, border: "1px solid #FCA5A5", borderRadius: 7, padding: "10px 14px", marginBottom: 14, color: "#991B1B", fontSize: 12 }}>
            Map the required field{missingRequired.length === 1 ? "" : "s"}: {missingRequired.map((f) => f.label).join(", ")}
          </div>
        )}

        <button style={{ ...S.btn, opacity: canConfirm ? 1 : 0.5 }} disabled={!canConfirm}
          onClick={() => onConfirm(mapping, locationCols)}>
          Import Data →
        </button>
      </div>
    </div>
  );
}
