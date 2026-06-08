import React from "react";
import { T } from "../styles/tokens.js";

// User selector. If no users have been uploaded yet, guides the admin to set up
// data first (the tool starts empty by design).
export default function LoginScreen({ users, onSelect, onSetup }) {
  const hasUsers = users.length > 0;
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${T.navy} 0%,#1E3A5F 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: T.white, borderRadius: 16, padding: "40px 48px", width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, letterSpacing: ".04em" }}>BRENNAN INDUSTRIES</div>
          <div style={{ fontSize: 12, color: T.teal, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 4 }}>Part Cost Lookup Tool</div>
          <div style={{ width: 40, height: 3, background: T.teal, borderRadius: 2, margin: "14px auto 0" }} />
        </div>

        {hasUsers ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Select Your Account</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {users.map((u) => (
                <button key={u.id} onClick={() => onSelect(u.id)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", border: `1.5px solid ${T.lgray}`, borderRadius: 10, background: T.offwhite, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.teal; e.currentTarget.style.background = T.tealLight; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.lgray; e.currentTarget.style.background = T.offwhite; }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: u.role === "admin" ? T.purple : T.navyMid, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{u.initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: T.slate, marginTop: 1 }}>{u.title} <span style={{ color: u.role === "admin" ? T.purple : T.teal, fontWeight: 600 }}>{u.role === "admin" ? "Admin / Leadership" : "Sales Rep"}</span></div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={onSetup} style={{ marginTop: 16, width: "100%", background: "transparent", color: T.slate, border: `1.5px solid ${T.lgray}`, borderRadius: 8, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Data Setup</button>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ background: T.orangeLight, border: "1px solid #FCD34D", borderRadius: 10, padding: "16px", color: "#92400E", fontSize: 13, marginBottom: 18 }}>
              No data has been loaded yet. Upload your Users, Parts, Customers, and Competitors to begin.
            </div>
            <button onClick={onSetup} style={{ width: "100%", background: T.teal, color: T.white, border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Go to Data Setup →</button>
          </div>
        )}
      </div>
    </div>
  );
}
