import React, { useState } from "react";
import { T, S } from "../styles/tokens.js";
import { QUOTE_REASONS } from "../constants.js";
import { calcSell, totalInv } from "../utils/pricing.js";
import { fmtSell } from "../utils/format.js";

// ---- CompetitorField -------------------------------------------------------
// Dropdown of uploaded competitors + an "Other" write-in.
export function CompetitorField({ value, onChange, inputStyle, competitors = [] }) {
  const options = [...competitors, "Other"];
  const isOther = value !== "" && !competitors.includes(value);
  const selVal = isOther ? "Other" : value;

  const baseSelect = {
    ...inputStyle,
    appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
    paddingRight: 28, cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <select value={selVal} onChange={(e) => onChange(e.target.value === "Other" ? "Other" : e.target.value)} style={baseSelect}>
        <option value="">- Select competitor -</option>
        {options.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {selVal === "Other" && (
        <input style={{ ...inputStyle, marginTop: 0 }} type="text" placeholder="Enter competitor name"
          value={isOther && value !== "Other" ? value : ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

// ---- CustomerNumberInput ---------------------------------------------------
// Autocomplete via an async `onSearch(query) -> Promise<customer[]>` seam, so it
// works whether the data lives in IndexedDB today or a NetSuite search later
// (no assumption that all customers are pre-loaded in memory). Debounced.
export function CustomerNumberInput({ value, onChangeNum, onChangeName, errorBorder, placeholder, onSearch }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef(null);
  const debRef = React.useRef(null);

  function runSearch(q) {
    if (debRef.current) clearTimeout(debRef.current);
    if (!q || !onSearch) { setSuggestions([]); setOpen(false); return; }
    debRef.current = setTimeout(async () => {
      const s = (await onSearch(q)) || [];
      setSuggestions(s);
      setOpen(s.length > 0);
      // Autofill the name when the typed value is an exact customer-number match.
      const exact = s.find((c) => c.customerNum?.toLowerCase() === q.toLowerCase());
      if (exact) onChangeName(exact.name);
    }, 150);
  }

  function handleInput(e) {
    const q = e.target.value;
    onChangeNum(q);
    onChangeName("");
    runSearch(q);
  }

  function handleSelect(c) {
    onChangeNum(c.customerNum);
    onChangeName(c.name);
    setSuggestions([]); setOpen(false);
  }

  React.useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => { document.removeEventListener("mousedown", handleClick); if (debRef.current) clearTimeout(debRef.current); };
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        style={{ width: "100%", padding: "8px 11px", border: `1.5px solid ${errorBorder ? T.red : open ? T.teal : T.lgray}`, borderRadius: 6, fontSize: 13, color: T.navy, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        value={value} onChange={handleInput}
        onFocus={() => runSearch(value)}
        placeholder={placeholder || "e.g. C-1001"} autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999, background: T.white, border: `1.5px solid ${T.teal}`, borderTop: "none", borderRadius: "0 0 8px 8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxHeight: 220, overflowY: "auto" }}>
          {suggestions.map((s) => (
            <div key={s.customerNum} onMouseDown={() => handleSelect(s)}
              style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${T.lgray}`, display: "flex", gap: 12, alignItems: "center" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.tealLight)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <span style={{ fontWeight: 700, color: T.navy, fontSize: 12, minWidth: 70 }}>{s.customerNum}</span>
              <span style={{ fontSize: 12, color: T.slate }}>{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- DailyBadge ------------------------------------------------------------
export function DailyBadge({ used, limit }) {
  const pct = used / limit, remaining = limit - used;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Daily</div>
      <div style={{ position: "relative", width: 70, height: 5, background: "rgba(255,255,255,0.2)", borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(pct * 100, 100)}%`, background: pct >= 1 ? "#FCA5A5" : pct >= 0.8 ? "#FCD34D" : "#5EEAD4", borderRadius: 3, transition: "width .4s" }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: pct >= 1 ? "#FCA5A5" : pct >= 0.8 ? "#FCD34D" : "#fff" }}>{used}/{limit}</div>
      {remaining > 0 && remaining <= 10 && <div style={{ fontSize: 11, color: "#FCD34D", fontWeight: 600 }}>{remaining} left</div>}
      {remaining <= 0 && <div style={{ fontSize: 11, color: "#FCA5A5", fontWeight: 600 }}>Limit reached</div>}
    </div>
  );
}

// ---- StepDot ---------------------------------------------------------------
export function StepDot({ n, active, done, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? T.teal : active ? T.navy : T.lgray, border: active ? `2px solid ${T.teal}` : "2px solid transparent", color: done || active ? T.white : T.slateLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, transition: "all .3s" }}>{done ? "✓" : n}</div>
      <div style={{ fontSize: 10, color: T.slate, whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
}

// ---- GlobalMarginBar -------------------------------------------------------
export function GlobalMarginBar({ ids, margins, setMargins }) {
  const [globalVal, setGlobalVal] = useState("");
  const filled = ids.filter((id) => margins[id]).length;
  const applyToEmpty = () => { const v = globalVal.trim(); if (!v) return; setMargins((prev) => { const u = { ...prev }; ids.forEach((id) => { if (!prev[id]) u[id] = v; }); return u; }); };
  const overrideAll = () => { const v = globalVal.trim(); if (!v) return; setMargins((prev) => { const u = { ...prev }; ids.forEach((id) => { u[id] = v; }); return u; }); };
  const clearAll = () => { setMargins((prev) => { const u = { ...prev }; ids.forEach((id) => { u[id] = ""; }); return u; }); setGlobalVal(""); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: T.offwhite, borderBottom: `1px solid ${T.lgray}`, padding: "10px 16px", flexWrap: "wrap" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".06em" }}>Apply Margin to All</div>
      {[45, 50, 55].map((pct) => (
        <button key={pct} onClick={() => setGlobalVal(String(pct))}
          style={{ padding: "5px 12px", fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: "pointer", border: `1.5px solid ${globalVal === String(pct) ? T.teal : T.lgray}`, background: globalVal === String(pct) ? T.teal : T.white, color: globalVal === String(pct) ? T.white : T.slate }}>{pct}%</button>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input style={{ ...S.input, width: 72, textAlign: "center", padding: "5px 8px", fontSize: 12 }} type="number" min="0" max="99" step="1" placeholder="or type %" value={globalVal} onChange={(e) => setGlobalVal(e.target.value)} />
        <span style={{ fontSize: 12, color: T.slate }}>%</span>
      </div>
      <button onClick={applyToEmpty} style={{ ...S.btn, padding: "5px 14px", fontSize: 11, background: T.navyMid }}>Apply to Empty Rows</button>
      <button onClick={overrideAll} style={{ ...S.btn, padding: "5px 14px", fontSize: 11 }}>Override All Rows</button>
      <button onClick={clearAll} style={{ ...S.btnO, padding: "5px 12px", fontSize: 11 }}>Clear All</button>
      <div style={{ fontSize: 11, color: T.slate, marginLeft: "auto" }}>{filled}/{ids.length} rows have a margin</div>
    </div>
  );
}

// ---- BulkRowEditor ---------------------------------------------------------
export function BulkRowEditor({ row, idx, applyAllType, applyAllReason, onUpdate, competitors }) {
  return (
    <tr style={{ background: row.error ? T.redLight : T.white, borderBottom: `1px solid ${T.lgray}` }}>
      <td style={{ padding: "7px 8px", textAlign: "center", color: T.slate, fontSize: 12, width: 28 }}>{idx + 1}</td>
      <td style={{ padding: "7px 8px", minWidth: 150 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: row.error ? T.red : T.navy }}>{row.partNum}</div>
        {row.desc && <div style={{ fontSize: 10, color: T.slate, marginTop: 1 }}>{row.desc}</div>}
        {row.error && <div style={{ fontSize: 10, color: T.red, marginTop: 1 }}>{row.error}</div>}
      </td>
      <td style={{ padding: "7px 8px", minWidth: 120 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[["spot", "Spot"], ["recurring", "Recurring"]].map(([t, l]) => (
            <button key={t} onClick={() => onUpdate(idx, "purchaseType", t)} style={{ flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 700, borderRadius: 5, cursor: "pointer", border: `1.5px solid ${row.purchaseType === t ? T.teal : T.lgray}`, background: row.purchaseType === t ? T.tealLight : T.white, color: row.purchaseType === t ? T.teal : T.slate }}>{l}</button>
          ))}
        </div>
        {applyAllType && <div style={{ fontSize: 9, color: T.slateLight, marginTop: 2, textAlign: "center" }}>set by batch</div>}
      </td>
      <td style={{ padding: "7px 8px", minWidth: 90 }}><input style={{ ...S.input, padding: "4px 7px", fontSize: 12 }} type="number" min="1" placeholder="N/A" value={row.qty || ""} onChange={(e) => onUpdate(idx, "qty", e.target.value)} /></td>
      <td style={{ padding: "7px 8px", minWidth: 130 }}>
        <CompetitorField value={row.competitor || ""} onChange={(v) => onUpdate(idx, "competitor", v)} inputStyle={{ ...S.input, padding: "4px 7px", fontSize: 11 }} competitors={competitors} />
      </td>
      <td style={{ padding: "7px 8px", minWidth: 90 }}><input style={{ ...S.input, padding: "4px 7px", fontSize: 12 }} type="number" step="0.01" placeholder="optional" value={row.targetPrice || ""} onChange={(e) => onUpdate(idx, "targetPrice", e.target.value)} /></td>
      <td style={{ padding: "7px 8px", minWidth: 160 }}>
        <select value={row.quoteReason || ""} onChange={(e) => onUpdate(idx, "quoteReason", e.target.value)} style={{ ...S.input, padding: "4px 7px", fontSize: 11, appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}>
          <option value="">-- Select --</option>
          {QUOTE_REASONS.filter((r) => r !== "Other").map((r) => <option key={r} value={r}>{r}</option>)}
          <option value="Other">Other</option>
        </select>
        {row.quoteReason === "Other" && (
          <input style={{ ...S.input, padding: "4px 7px", fontSize: 11, marginTop: 3 }} placeholder="Describe reason" value={row.quoteReasonOther || ""} onChange={(e) => onUpdate(idx, "quoteReasonOther", e.target.value)} />
        )}
        {applyAllReason && !row.quoteReason && <div style={{ fontSize: 9, color: T.slateLight, marginTop: 2 }}>set by batch</div>}
      </td>
    </tr>
  );
}

// ---- BulkResultRow ---------------------------------------------------------
export function BulkResultRow({ r, idx, margin, onMarginChange, isAdmin, floorMargin }) {
  const mn = parseFloat(margin) / 100;
  const sell = !r.noCost && mn > 0 && mn < 1 ? calcSell(r.cost, mn) : null;
  const below = mn > 0 && mn < floorMargin;
  return (
    <tr style={{ background: r.noCost ? "#FFF5F5" : idx % 2 === 0 ? T.white : T.offwhite, borderBottom: `1px solid ${T.lgray}` }}>
      <td style={{ padding: "7px 10px", fontWeight: 700, fontSize: 12, color: T.navy, whiteSpace: "nowrap" }}>{r.partNum}</td>
      <td style={{ padding: "7px 10px", fontSize: 11, color: T.slate, maxWidth: 150 }}>{r.desc}</td>
      <td style={{ padding: "7px 10px", fontSize: 11, textTransform: "capitalize" }}>{r.purchaseType}</td>
      <td style={{ padding: "7px 10px", fontSize: 11, textAlign: "center" }}>{r.qty || "-"}</td>
      {isAdmin && <td style={{ padding: "7px 10px", fontSize: 10, color: "#0E7490", maxWidth: 200 }}>{r.scenario}</td>}
      <td style={{ padding: "7px 10px", fontWeight: 700, textAlign: "right" }}>{r.noCost ? <span style={S.tag("red")}>No Cost</span> : <span style={{ fontSize: 13, color: T.navy }}>${r.cost.toFixed(4)}</span>}</td>
      <td style={{ padding: "7px 8px", minWidth: 70 }}>
        {!r.noCost && <input style={{ ...S.input, padding: "4px 6px", fontSize: 11, width: 60, textAlign: "center" }} type="number" min="0" max="99" placeholder="%" value={margin} onChange={(e) => onMarginChange(r.id, e.target.value)} />}
      </td>
      <td style={{ padding: "7px 10px", textAlign: "right", minWidth: 100 }}>
        {sell ? (<div><div style={{ fontSize: 12, fontWeight: 700, color: below ? "#92400E" : "#065F46" }}>{fmtSell(sell)}</div>{below && <div style={{ fontSize: 9, color: T.red }}>below floor</div>}{below && <div style={{ fontSize: 9, color: T.slate }}>Min: {fmtSell(calcSell(r.cost, floorMargin))}</div>}</div>) : "-"}
      </td>
      <td style={{ padding: "7px 10px", fontSize: 11, color: T.slate }}>{r.competitor || "-"}</td>
      <td style={{ padding: "7px 10px", fontSize: 11, color: T.slate }}>{r.targetPrice ? `$${parseFloat(r.targetPrice).toFixed(2)}` : "-"}</td>
      <td style={{ padding: "7px 10px" }}>{r.noCost && <span style={{ ...S.tag("red"), fontSize: 10 }}>Flag</span>}</td>
    </tr>
  );
}

// ---- PricingHistoryTab -----------------------------------------------------
export function PricingHistoryTab({ customerName, customerNum, userId, allLog }) {
  const history = allLog
    .filter((e) => e.userId === userId && (e.customerNum === customerNum || e.customerName?.toLowerCase() === customerName?.toLowerCase()))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));

  if (history.length === 0) {
    return <div style={{ padding: "24px", textAlign: "center", color: T.slateLight, fontSize: 13 }}>No previous quotes found for this customer.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: T.offwhite }}>
            {["Date", "Part #", "Description", "Type", "Qty", "Cost", "Margin", "Sell Price", "Competitor", "Target $", "Reason"].map((h) => (
              <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `2px solid ${T.lgray}`, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((e, idx) => (
            <tr key={e.id} style={{ background: idx % 2 === 0 ? T.white : T.offwhite, borderBottom: `1px solid ${T.lgray}` }}>
              <td style={{ padding: "6px 10px", color: T.slateLight, whiteSpace: "nowrap" }}>{e.dateStr || "Today"}</td>
              <td style={{ padding: "6px 10px", fontWeight: 700, color: T.navy, whiteSpace: "nowrap" }}>{e.partNum}</td>
              <td style={{ padding: "6px 10px", color: T.slate, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.desc}</td>
              <td style={{ padding: "6px 10px", textTransform: "capitalize" }}>{e.purchaseType}</td>
              <td style={{ padding: "6px 10px", textAlign: "center" }}>{e.qty || "-"}</td>
              <td style={{ padding: "6px 10px", fontWeight: 700 }}>{e.noCost ? <span style={S.tag("red")}>No Cost</span> : `$${e.cost?.toFixed(4) || "-"}`}</td>
              <td style={{ padding: "6px 10px", textAlign: "center" }}>{e.desiredMarginPct ? <span style={S.tag(e.belowFloor ? "orange" : "green")}>{e.desiredMarginPct}%</span> : "-"}</td>
              <td style={{ padding: "6px 10px", fontWeight: 600, color: e.belowFloor ? "#92400E" : "#065F46" }}>{e.sellPrice ? fmtSell(e.sellPrice) : "-"}</td>
              <td style={{ padding: "6px 10px", color: T.slate }}>{e.competitor || "-"}</td>
              <td style={{ padding: "6px 10px", color: T.slate }}>{e.targetPrice ? `$${parseFloat(e.targetPrice).toFixed(2)}` : "-"}</td>
              <td style={{ padding: "6px 10px", color: T.slate, fontSize: 10 }}>{e.quoteReason || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
