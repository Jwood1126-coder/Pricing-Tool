import React, { useState, useMemo } from "react";
import { T, S } from "../styles/tokens.js";
import { fmtSell } from "../utils/format.js";
import { downloadCSV, todayStamp } from "../utils/export.js";

// Full audit trail across all users (admin only). `allLog` entries carry a numeric
// `ts` (creation time) and userName/role/etc. `usersById` maps userId -> user.
export default function AuditPanel({ allLog, usersById, onClearLog }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quick, setQuick] = useState("all");
  const [fUser, setFUser] = useState("");
  const [fPart, setFPart] = useState("");
  const [fMargin, setFMargin] = useState("");
  const [fSell, setFSell] = useState("");
  const [fComp, setFComp] = useState("");
  const [fTarget, setFTarget] = useState("");

  function applyQuick(q) {
    setQuick(q);
    const fmt = (d) => d.toISOString().slice(0, 10);
    const now = new Date();
    if (q === "today") { setDateFrom(fmt(now)); setDateTo(fmt(now)); }
    if (q === "7d") { const d = new Date(); d.setDate(d.getDate() - 6); setDateFrom(fmt(d)); setDateTo(fmt(now)); }
    if (q === "30d") { const d = new Date(); d.setDate(d.getDate() - 29); setDateFrom(fmt(d)); setDateTo(fmt(now)); }
    if (q === "all") { setDateFrom(""); setDateTo(""); }
  }

  const filtered = useMemo(() => {
    return allLog.filter((e) => {
      const eDate = e.ts ? new Date(e.ts) : null;
      if (dateFrom && eDate) { const f = new Date(dateFrom); f.setHours(0, 0, 0, 0); if (eDate < f) return false; }
      if (dateTo && eDate) { const t = new Date(dateTo); t.setHours(23, 59, 59, 999); if (eDate > t) return false; }
      if (fUser && !e.userName?.toLowerCase().includes(fUser.toLowerCase())) return false;
      if (fPart && !e.partNum?.toLowerCase().includes(fPart.toLowerCase())) return false;
      if (fMargin && !String(e.desiredMarginPct || "").includes(fMargin)) return false;
      if (fSell && !String(e.sellPrice ? e.sellPrice.toFixed(2) : "").includes(fSell)) return false;
      if (fComp && !e.competitor?.toLowerCase().includes(fComp.toLowerCase())) return false;
      if (fTarget && !String(e.targetPrice || "").includes(fTarget)) return false;
      return true;
    });
  }, [allLog, dateFrom, dateTo, fUser, fPart, fMargin, fSell, fComp, fTarget]);

  function exportCSV() {
    if (!filtered.length) return;
    const hdr = ["User", "Role", "Part #", "Description", "Purchase Type", "Qty", "Cost Logic", "Cost", "Margin %", "Sell Price", "Below Floor", "Competitor", "Target Price", "Source", "Date", "Time"];
    const rows = filtered.map((e) => [
      e.userName || "", e.role || "", e.partNum, e.desc || "", e.purchaseType, e.qty || "",
      e.scenario || "", e.noCost ? "No Cost" : e.cost?.toFixed(4) || "", e.desiredMarginPct || "",
      e.sellPrice ? e.sellPrice.toFixed(4) : "", e.belowFloor ? "YES" : "NO",
      e.competitor || "", e.targetPrice || "", e.source || "", e.dateStr || "", e.timestamp || "",
    ]);
    downloadCSV(`AuditTrail_${todayStamp()}.csv`, hdr, rows);
  }

  function clearFilters() { setDateFrom(""); setDateTo(""); setQuick("all"); setFUser(""); setFPart(""); setFMargin(""); setFSell(""); setFComp(""); setFTarget(""); }

  const iF = { ...S.input, padding: "6px 9px", fontSize: 11 };

  return (
    <div style={S.card}>
      <div style={{ ...S.head, background: `linear-gradient(90deg,${T.purple},#6D28D9)` }}>
        <span>Full Audit Trail - All Users ({filtered.length} of {allLog.length} records)</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={clearFilters} style={{ background: "rgba(255,255,255,0.15)", color: T.white, border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>Clear Filters</button>
          <button onClick={exportCSV} style={{ background: "rgba(255,255,255,0.2)", color: T.white, border: "1px solid rgba(255,255,255,0.4)", borderRadius: 5, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Export CSV</button>
          {onClearLog && <button onClick={() => { if (confirm("Clear the entire audit log? Uploaded data (parts/customers/etc.) is kept. This cannot be undone.")) onClearLog(); }} style={{ background: "rgba(0,0,0,0.2)", color: T.white, border: "1px solid rgba(255,255,255,0.4)", borderRadius: 5, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Clear Log</button>}
        </div>
      </div>

      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.lgray}`, background: "#FAFBFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".05em" }}>Date Range</span>
          {[["today", "Today"], ["7d", "Last 7 Days"], ["30d", "Last 30 Days"], ["all", "All Time"]].map(([k, l]) => (
            <button key={k} onClick={() => applyQuick(k)} style={{ padding: "4px 12px", fontSize: 11, fontWeight: 700, borderRadius: 5, cursor: "pointer", border: `1.5px solid ${quick === k ? T.purple : T.lgray}`, background: quick === k ? "#EDE9FE" : T.white, color: quick === k ? T.purple : T.slate }}>{l}</button>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <input style={{ ...iF, width: 130 }} type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setQuick(""); }} />
            <span style={{ color: T.slateLight, fontSize: 11 }}>→</span>
            <input style={{ ...iF, width: 130 }} type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setQuick(""); }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
          {[["User", fUser, setFUser, "e.g. James Davis"], ["Part #", fPart, setFPart, "e.g. BRN-4820"], ["Margin %", fMargin, setFMargin, "e.g. 45"], ["Sell Price", fSell, setFSell, "e.g. 1.52"], ["Competitor", fComp, setFComp, "e.g. World Wide"], ["Target Price", fTarget, setFTarget, "e.g. 5.00"]].map(([label, val, setter, ph]) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{label}</div>
              <input style={iF} value={val} onChange={(e) => setter(e.target.value)} placeholder={ph} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: T.slateLight, fontSize: 13 }}>No records match the current filters.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: T.offwhite }}>
                {["User", "Part #", "Description", "Type", "Qty", "Cost Logic", "Cost", "Margin %", "Sell Price", "Below Floor", "Competitor", "Target $", "Source", "Date"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `2px solid ${T.lgray}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, idx) => {
                const user = usersById[e.userId];
                return (
                  <tr key={e.id} style={{ background: idx % 2 === 0 ? T.white : "#FAFBFC", borderBottom: `1px solid ${T.offwhite}` }}>
                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: user?.role === "admin" ? T.purple : T.navyMid, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{user?.initials || "?"}</div>
                        <div><div style={{ fontSize: 11, fontWeight: 600, color: T.navy }}>{user?.name || e.userName || e.userId}</div><div style={{ fontSize: 9, color: T.slateLight }}>{user?.title}</div></div>
                      </div>
                    </td>
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: T.navy, whiteSpace: "nowrap" }}>{e.partNum}</td>
                    <td style={{ padding: "7px 10px", color: T.slate, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.desc}</td>
                    <td style={{ padding: "7px 10px", textTransform: "capitalize" }}>{e.purchaseType}</td>
                    <td style={{ padding: "7px 10px", textAlign: "center" }}>{e.qty || "-"}</td>
                    <td style={{ padding: "7px 10px", color: "#0E7490", fontSize: 10, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.scenario}</td>
                    <td style={{ padding: "7px 10px", fontWeight: 700 }}>{e.noCost ? <span style={S.tag("red")}>No Cost</span> : `$${e.cost?.toFixed(4) || "-"}`}</td>
                    <td style={{ padding: "7px 10px", textAlign: "center" }}>{e.desiredMarginPct ? <span style={S.tag(e.belowFloor ? "orange" : "green")}>{e.desiredMarginPct}%</span> : "-"}</td>
                    <td style={{ padding: "7px 10px", fontWeight: 600, color: e.belowFloor ? "#92400E" : "#065F46" }}>{e.sellPrice ? fmtSell(e.sellPrice) : "-"}</td>
                    <td style={{ padding: "7px 10px", textAlign: "center" }}>{e.desiredMarginPct ? <span style={S.tag(e.belowFloor ? "red" : "green")}>{e.belowFloor ? "Below" : "OK"}</span> : "-"}</td>
                    <td style={{ padding: "7px 10px", color: T.slate }}>{e.competitor || "-"}</td>
                    <td style={{ padding: "7px 10px", color: T.slate }}>{e.targetPrice ? `$${parseFloat(e.targetPrice).toFixed(2)}` : "-"}</td>
                    <td style={{ padding: "7px 10px" }}><span style={{ ...S.tag(e.source === "bulk" ? "orange" : "green"), fontSize: 10 }}>{e.source}</span></td>
                    <td style={{ padding: "7px 10px", color: T.slateLight, whiteSpace: "nowrap" }}>{e.dateStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
