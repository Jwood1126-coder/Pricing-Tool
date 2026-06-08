// Style tokens lifted verbatim from the original tool so the UI looks identical.

export const T = {
  navy: "#0F2744", navyMid: "#1A3F6F", teal: "#028090", tealLight: "#EFF9FB",
  green: "#059669", greenLight: "#D1FAE5", red: "#DC2626", redLight: "#FEE2E2",
  orange: "#D97706", orangeLight: "#FEF3C7", slate: "#64748B", slateLight: "#94A3B8",
  lgray: "#E2E8F0", offwhite: "#F0F4F8", white: "#FFFFFF", purple: "#7C3AED",
};

export const S = {
  card: { background: T.white, borderRadius: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20, overflow: "hidden" },
  head: { background: `linear-gradient(90deg,${T.navy},${T.navyMid})`, color: T.white, padding: "11px 18px", fontSize: 12, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "space-between" },
  input: { width: "100%", padding: "8px 11px", border: `1.5px solid ${T.lgray}`, borderRadius: 6, fontSize: 13, color: T.navy, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  btn: { background: T.teal, color: T.white, border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnO: { background: "transparent", color: T.teal, border: `1.5px solid ${T.teal}`, borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  lbl: { fontSize: 11, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5, display: "block" },
  tag: (c) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: c === "green" ? T.greenLight : c === "red" ? T.redLight : c === "orange" ? T.orangeLight : c === "purple" ? "#EDE9FE" : T.lgray,
    color: c === "green" ? "#065F46" : c === "red" ? "#991B1B" : c === "orange" ? "#92400E" : c === "purple" ? "#5B21B6" : "#475569",
  }),
};
