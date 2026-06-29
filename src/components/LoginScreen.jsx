import React, { useState, useMemo } from "react";
import { T, S } from "../styles/tokens.js";

const MAX_SHOWN = 50; // cap rendered accounts so a huge Users upload can't flood the screen

// User selector. "Data Setup" is always reachable at the top (so a bad/large
// Users upload can't bury it), and the account list is searchable + capped.
export default function LoginScreen({ users, onSelect, onSetup }) {
  const hasUsers = users.length > 0;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.initials?.toLowerCase().includes(q) ||
        u.title?.toLowerCase().includes(q)
    );
  }, [users, query]);

  const shown = filtered.slice(0, MAX_SHOWN);

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${T.navy} 0%,#1E3A5F 100%)`, display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: "'Segoe UI',system-ui,sans-serif", padding: "40px 16px", boxSizing: "border-box" }}>
      <div style={{ background: T.white, borderRadius: 16, padding: "32px 40px", width: 460, maxWidth: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, letterSpacing: ".04em" }}>BRENNAN INDUSTRIES</div>
          <div style={{ fontSize: 12, color: T.teal, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 4 }}>Part Cost Lookup Tool</div>
          <div style={{ width: 40, height: 3, background: T.teal, borderRadius: 2, margin: "14px auto 0" }} />
        </div>

        {/* Always-visible setup access so it can never be buried under the account list */}
        <button onClick={onSetup} style={{ width: "100%", background: hasUsers ? "transparent" : T.teal, color: hasUsers ? T.slate : T.white, border: `1.5px solid ${hasUsers ? T.lgray : T.teal}`, borderRadius: 8, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 18 }}>
          {hasUsers ? "⚙ Data Setup" : "Go to Data Setup →"}
        </button>

        {!hasUsers ? (
          <div style={{ background: T.orangeLight, border: "1px solid #FCD34D", borderRadius: 10, padding: "16px", color: "#92400E", fontSize: 13, textAlign: "center" }}>
            No data has been loaded yet. Use Data Setup to upload your Users, Parts, Customers, and Competitors to begin.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".06em" }}>Select Your Account</div>
              <div style={{ fontSize: 11, color: T.slateLight }}>{users.length.toLocaleString()} total</div>
            </div>

            {users.length > MAX_SHOWN && (
              <input
                style={{ ...S.input, marginBottom: 10 }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, initials, or title…"
                autoFocus
              />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
              {shown.map((u) => (
                <button key={u.id} onClick={() => onSelect(u.id)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", border: `1.5px solid ${T.lgray}`, borderRadius: 10, background: T.offwhite, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.teal; e.currentTarget.style.background = T.tealLight; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.lgray; e.currentTarget.style.background = T.offwhite; }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: u.role === "admin" ? T.purple : T.navyMid, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{u.initials}</div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: T.slate, marginTop: 1 }}>{u.title} <span style={{ color: u.role === "admin" ? T.purple : T.teal, fontWeight: 600 }}>{u.role === "admin" ? "Admin / Leadership" : "Sales Rep"}</span></div>
                  </div>
                </button>
              ))}
              {shown.length === 0 && (
                <div style={{ padding: "16px", textAlign: "center", color: T.slateLight, fontSize: 13 }}>No accounts match "{query}".</div>
              )}
            </div>

            {filtered.length > MAX_SHOWN && (
              <div style={{ marginTop: 10, fontSize: 11, color: T.slateLight, textAlign: "center" }}>
                Showing {MAX_SHOWN} of {filtered.length.toLocaleString()} — type to narrow the list.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
