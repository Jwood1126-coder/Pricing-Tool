import React, { useState, useMemo, useEffect, useRef } from "react";
import { T, S } from "./styles/tokens.js";
import { QUOTE_REASONS } from "./constants.js";
import { buildScenario, calcSell } from "./utils/pricing.js";
import { fmtSell, parseQty } from "./utils/format.js";
import { downloadCSV } from "./utils/export.js";
import { parseCSV } from "./data/parser.js";
import * as store from "./data/store.js";
import {
  CompetitorField, CustomerNumberInput, DailyBadge, StepDot,
  GlobalMarginBar, BulkRowEditor, BulkResultRow, PricingHistoryTab,
} from "./components/shared.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import DataManagement from "./components/DataManagement.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import AuditPanel from "./components/AuditPanel.jsx";

const uid = () =>
  (crypto?.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

// Lookups already logged today for a user — used to seed the daily counter on
// login so the limit survives reloads / re-logins (can't be reset by switching).
function usageToday(log, userId) {
  const today = new Date().toLocaleDateString();
  return log.filter((e) => e.userId === userId && e.dateStr === today).length;
}

// Pricing history for a rep + customer. Prefer the stable customerNum; only fall
// back to name match when no number is given (avoids cross-matching similarly
// named customers with different numbers).
function filterHistory(log, userId, num, name) {
  return log.filter((e) => {
    if (e.userId !== userId) return false;
    if (num) return e.customerNum === num;
    if (name) return e.customerName?.toLowerCase() === name.toLowerCase();
    return false;
  });
}

export default function App() {
  // -- Loaded data (from IndexedDB) --
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const loadedRef = useRef(false);
  const [users, setUsers] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [settings, setSettings] = useState({ floorMargin: 0.4, dailyLimit: 100, bulkLimit: 25 });
  const [log, setLog] = useState([]); // all persisted entries
  const [partsCount, setPartsCount] = useState(0);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const { floorMargin, dailyLimit, bulkLimit } = settings;

  async function reloadData() {
    // Note: customers are NOT loaded into memory — autocomplete uses the async
    // store.searchCustomers seam so this scales to very large customer sets.
    try {
      const [u, comp, loc, set, lg, status] = await Promise.all([
        store.getUsers(), store.getCompetitors(),
        store.getLocations(), store.getSettings(), store.getLog(), store.datasetStatus(),
      ]);
      setUsers(u); setCompetitors(comp); setLocations(loc); setSettings(set);
      setLog(lg.sort((a, b) => (b.ts || 0) - (a.ts || 0)));
      setPartsCount(status.parts.count);
      setLoadError(null);
      loadedRef.current = true;
      setLoaded(true);
    } catch (e) {
      // Never hang on "Loading…": surface the error with a recovery path.
      console.error("Data load failed:", e);
      setLoadError(e?.message || String(e));
      loadedRef.current = true;
      setLoaded(true);
    }
  }
  useEffect(() => {
    reloadData();
    // Watchdog: if the local database is locked by another window or never
    // opens, don't leave the user stuck on "Loading…" forever.
    const t = setTimeout(() => {
      if (!loadedRef.current) {
        setLoadError("Loading timed out. The local database may be open in another window of the app, or may need a reset.");
        setLoaded(true);
      }
    }, 15000);
    return () => clearTimeout(t);
  }, []);

  // -- Navigation / session --
  const [currentUser, setCurrentUser] = useState(null);
  const [setup, setSetup] = useState(false); // pre-login data setup
  const [mode, setMode] = useState("single");
  const [dailyUsed, setDailyUsed] = useState(0);
  const [sessionLog, setSessionLog] = useState([]);
  const [selected, setSelected] = useState({});
  const [selectAll, setSelectAll] = useState(false);

  // -- Single lookup --
  const [step, setStep] = useState(1);
  const [partNum, setPartNum] = useState("");
  const [partError, setPartError] = useState("");
  const [foundPart, setFoundPart] = useState(null);
  const [purchaseType, setPurchaseType] = useState("");
  const [qty, setQty] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [result, setResult] = useState(null);
  const [desiredMargin, setDesiredMargin] = useState("");
  const [customerNum, setCustomerNum] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [historyTab, setHistoryTab] = useState("lookup");
  const [quoteReason, setQuoteReason] = useState("");
  const [quoteReasonOther, setQuoteReasonOther] = useState("");
  const [quoteReasonError, setQuoteReasonError] = useState("");

  // -- Bulk --
  const [bulkCustomerNum, setBulkCustomerNum] = useState("");
  const [bulkCustomerName, setBulkCustomerName] = useState("");
  const [bulkIsNewCustomer, setBulkIsNewCustomer] = useState(false);
  const [bulkCustomerError, setBulkCustomerError] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkApplyType, setBulkApplyType] = useState(false);
  const [bulkAllType, setBulkAllType] = useState("spot");
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkError, setBulkError] = useState("");
  const [bulkStep, setBulkStep] = useState(1);
  const [bulkMargins, setBulkMargins] = useState({});
  const [bulkApplyReason, setBulkApplyReason] = useState(false);
  const [bulkAllReason, setBulkAllReason] = useState("");
  const [bulkHistoryTab, setBulkHistoryTab] = useState("input");
  const fileRef = useRef();

  const remaining = dailyLimit - dailyUsed;
  const validBulk = bulkRows.filter((r) => !r.error).length;
  const anySelected = Object.values(selected).some((v) => v);
  const isAdmin = currentUser ? usersById[currentUser]?.role === "admin" : false;
  const bulkEligibleIds = bulkResults ? bulkResults.filter((r) => !r.noCost).map((r) => r.id) : [];
  const STEPS = [{ n: 1, l: "Part Lookup" }, { n: 2, l: "Purchase Type" }, { n: 3, l: "Qty & Details" }, { n: 4, l: "Results" }];

  // -- Derived history --
  const pricingHistory = useMemo(
    () => filterHistory(log, currentUser, customerNum, customerName),
    [customerNum, customerName, log, currentUser]
  );
  const bulkPricingHistory = useMemo(
    () => filterHistory(log, currentUser, bulkCustomerNum, bulkCustomerName),
    [bulkCustomerNum, bulkCustomerName, log, currentUser]
  );

  // -- Helpers --
  function resetSingle() { setStep(1); setPartNum(""); setFoundPart(null); setPurchaseType(""); setQty(""); setCompetitor(""); setTargetPrice(""); setResult(null); setDesiredMargin(""); setPartError(""); setCustomerNum(""); setCustomerName(""); setIsNewCustomer(false); setCustomerError(""); setHistoryTab("lookup"); setQuoteReason(""); setQuoteReasonOther(""); setQuoteReasonError(""); }
  function resetBulk() { setBulkInput(""); setBulkFile(null); setBulkRows([]); setBulkResults(null); setBulkError(""); setBulkStep(1); setBulkApplyType(false); setBulkMargins({}); setBulkCustomerNum(""); setBulkCustomerName(""); setBulkIsNewCustomer(false); setBulkCustomerError(""); setBulkApplyReason(false); setBulkAllReason(""); setBulkHistoryTab("input"); if (fileRef.current) fileRef.current.value = ""; }

  function addEntries(entries) {
    store.appendLog(entries);
    setLog((prev) => [...entries, ...prev]);
    setSessionLog((prev) => [...entries, ...prev]);
    setSelected((prev) => { const u = { ...prev }; entries.forEach((e) => { u[e.id] = false; }); return u; });
  }

  // -- Single handlers --
  async function handleLookup() {
    if (remaining <= 0) { setPartError("Daily limit reached."); return; }
    const key = partNum.trim().toUpperCase();
    if (!key) { setPartError("Please enter a part number."); return; }
    try {
      const p = await store.getPart(key);
      if (!p) { setPartError("Part not found in uploaded data."); return; }
      setPartError(""); setFoundPart(p); setStep(2);
    } catch (err) {
      setPartError("Could not read parts data: " + (err?.message || err));
    }
  }

  function handleCalc() {
    if (!isNewCustomer && (!customerNum.trim() || !customerName.trim())) {
      setCustomerError("Please enter both Customer Number and Name, or click New Customer."); return;
    }
    const finalReason = quoteReason === "Other" ? quoteReasonOther.trim() || "Other" : quoteReason;
    if (!quoteReason) { setQuoteReasonError("Please select a reason for this pricing request."); return; }
    setCustomerError(""); setQuoteReasonError("");
    const qtyNum = parseQty(qty);
    const r = buildScenario(foundPart, purchaseType, qtyNum);
    setResult({
      ...r, partNum: partNum.toUpperCase(), desc: foundPart.desc, purchaseType, qty: qtyNum,
      inventory: foundPart.inventory, competitor, targetPrice,
      customerNum: isNewCustomer ? "NEW" : customerNum.trim(),
      customerName: isNewCustomer ? "New Customer" : customerName.trim(),
      quoteReason: finalReason,
    });
    setDailyUsed((p) => p + 1); setStep(4);
  }

  function handleAddToLog() {
    const mn = parseFloat(desiredMargin) / 100 || null;
    const sell = mn && result.cost > 0 ? calcSell(result.cost, mn) : null;
    const now = new Date();
    const e = {
      id: uid(), ...result, userId: currentUser, userName: usersById[currentUser]?.name || currentUser,
      role: isAdmin ? "Admin / Leadership" : "Sales Rep",
      desiredMarginPct: mn ? (mn * 100).toFixed(1) : null, sellPrice: sell,
      belowFloor: mn ? mn < floorMargin : false, source: "single",
      ts: now.getTime(), timestamp: now.toLocaleTimeString(), dateStr: now.toLocaleDateString(),
    };
    addEntries([e]); resetSingle();
  }

  // -- Bulk handlers --
  function handleFile(e) { const f = e.target.files[0]; if (!f) return; setBulkFile(f); setBulkInput(""); }

  async function handleBulkParse() {
    setBulkError("");
    let raw = [];
    try {
    if (bulkFile) {
      const parsed = await parseCSV(bulkFile);
      // Match a target column by header, preferring exact match, then prefix,
      // then substring — so "PartNumberDescription" can't steal "Part Number".
      const find = (row, names) => {
        const keys = Object.keys(row);
        const norm = (s) => s.toLowerCase().replace(/\s+/g, "");
        for (const test of [(k, n) => norm(k) === n, (k, n) => norm(k).startsWith(n), (k, n) => norm(k).includes(n)]) {
          const k = keys.find((kk) => names.some((n) => test(kk, n)));
          if (k) return row[k];
        }
        return "";
      };
      raw = parsed.map((row) => ({
        partNum: String(find(row, ["partnumber", "partnum", "part"]) || "").toUpperCase().trim(),
        qty: parseQty(find(row, ["quantityrequested", "quantity", "qty"])) ?? "",
        purchaseType: String(find(row, ["purchasetype", "type"]) || "spot").toLowerCase().includes("rec") ? "recurring" : "spot",
        competitor: String(find(row, ["competitor"]) || "").trim(),
        targetPrice: String(find(row, ["targetprice", "target"]) || "").trim(),
      })).filter((r) => r.partNum);
    } else {
      const parts = bulkInput.split(/[\n,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
      if (!parts.length) { setBulkError("Please enter at least one part number."); return; }
      raw = parts.map((p) => ({ partNum: p, qty: "", purchaseType: "spot", competitor: "", targetPrice: "" }));
    }
    if (raw.length > bulkLimit) { setBulkError(`Bulk import is limited to ${bulkLimit} items. You submitted ${raw.length}.`); return; }

    const parts = await store.getParts(raw.map((r) => r.partNum));
    const rows = raw.map((r, i) => ({
      ...r, quoteReason: "", quoteReasonOther: "", part: parts[i] || null,
      desc: parts[i]?.desc || "", error: parts[i] ? null : "Part not found",
    }));
    setBulkRows(rows); setBulkStep(2);
    } catch (err) {
      setBulkError("Could not parse the file: " + (err?.message || err));
    }
  }

  function handleBulkRun() {
    setBulkError("");
    if (!bulkIsNewCustomer && (!bulkCustomerNum.trim() || !bulkCustomerName.trim())) {
      setBulkCustomerError("Please enter both Customer Number and Name, or click New Customer."); return;
    }
    setBulkCustomerError("");
    const valid = bulkRows.filter((r) => !r.error);
    if (!valid.length) { setBulkError("No valid parts to process."); return; }
    if (valid.some((r) => !r.purchaseType)) { setBulkError("All items must have a purchase type."); return; }
    if (valid.some((r) => !r.quoteReason)) { setBulkError("All items must have a quote reason selected (use 'Apply one quote reason to all items' to set them quickly)."); return; }
    if (valid.length > remaining) { setBulkError(`This batch requires ${valid.length} lookups but you only have ${remaining} remaining today.`); return; }
    const bCustNum = bulkIsNewCustomer ? "NEW" : bulkCustomerNum.trim();
    const bCustName = bulkIsNewCustomer ? "New Customer" : bulkCustomerName.trim();
    const now = new Date();
    const results = valid.map((r) => {
      const sc = buildScenario(r.part, r.purchaseType, r.qty);
      const finalReason = r.quoteReason === "Other" ? r.quoteReasonOther || "Other" : r.quoteReason;
      return {
        ...sc, id: uid(), partNum: r.partNum, desc: r.part.desc, purchaseType: r.purchaseType,
        qty: r.qty || null, inventory: r.part.inventory, competitor: r.competitor, targetPrice: r.targetPrice,
        quoteReason: finalReason, customerNum: bCustNum, customerName: bCustName,
      };
    });
    setDailyUsed((p) => p + valid.length); setBulkResults(results);
    const initM = {}; results.forEach((r) => { if (!r.noCost) initM[r.id] = ""; }); setBulkMargins(initM);
    setBulkStep(3);
    const entries = results.map((r, i) => ({
      ...r, userId: currentUser, userName: usersById[currentUser]?.name || currentUser,
      role: isAdmin ? "Admin / Leadership" : "Sales Rep",
      desiredMarginPct: null, sellPrice: null, belowFloor: false, source: "bulk",
      ts: now.getTime() + i, timestamp: now.toLocaleTimeString(), dateStr: now.toLocaleDateString(),
    }));
    addEntries(entries);
  }

  function handleSelectAll(v) { setSelectAll(v); setSelected(Object.fromEntries(sessionLog.map((e) => [e.id, v]))); }
  function handleSelectOne(id, v) { const u = { ...selected, [id]: v }; setSelected(u); setSelectAll(sessionLog.every((e) => u[e.id])); }
  function handleApplyAll(c) { setBulkApplyType(c); if (c) setBulkRows((prev) => prev.map((r) => ({ ...r, purchaseType: bulkAllType }))); }
  function handleAllTypeChange(t) { setBulkAllType(t); if (bulkApplyType) setBulkRows((prev) => prev.map((r) => ({ ...r, purchaseType: t }))); }
  function handleApplyAllReason(c) { setBulkApplyReason(c); if (c && bulkAllReason) setBulkRows((prev) => prev.map((r) => ({ ...r, quoteReason: bulkAllReason, quoteReasonOther: "" }))); }
  function handleAllReasonChange(v) { setBulkAllReason(v); if (bulkApplyReason) setBulkRows((prev) => prev.map((r) => ({ ...r, quoteReason: v, quoteReasonOther: "" }))); }

  // Bulk margins entered in the results step are auto-synced into the persisted
  // log so the audit trail + CSV export capture bulk pricing decisions (the
  // original tool showed them on screen but never recorded them).
  function applyBulkMargins(next) {
    setBulkMargins(next);
    if (!bulkResults) return;
    const patch = {};
    for (const r of bulkResults) {
      const mn = parseFloat(next[r.id]) / 100;
      const ok = mn > 0 && mn < 1 && !r.noCost;
      patch[r.id] = {
        desiredMarginPct: mn > 0 ? (mn * 100).toFixed(1) : null,
        sellPrice: ok ? calcSell(r.cost, mn) : null,
        belowFloor: mn > 0 ? mn < floorMargin : false,
      };
    }
    const merge = (e) => (patch[e.id] ? { ...e, ...patch[e.id] } : e);
    setLog(log.map(merge));
    const updatedSession = sessionLog.map(merge);
    setSessionLog(updatedSession);
    store.appendLog(updatedSession.filter((e) => patch[e.id]));
  }
  const setBulkMarginsSynced = (updater) => applyBulkMargins(typeof updater === "function" ? updater(bulkMargins) : updater);

  function handleExport() {
    const rows = sessionLog.filter((e) => selected[e.id]);
    if (!rows.length) return;
    const hdr = isAdmin
      ? ["Looked Up By", "Role", "Part #", "Description", "Purchase Type", "Qty", "Cost Logic", "Cost", "Margin %", "Sell Price", "Below Floor", "Competitor", "Target Price", "Source", "Date", "Time"]
      : ["Looked Up By", "Part #", "Description", "Purchase Type", "Qty", "Cost", "Margin %", "Sell Price", "Below Floor", "Competitor", "Target Price", "Source", "Time"];
    const data = rows.map((e) => {
      const cost = e.noCost ? "No Cost" : e.cost?.toFixed(4) || "";
      const pricing = [e.desiredMarginPct || "", e.sellPrice ? e.sellPrice.toFixed(4) : "", e.belowFloor ? "YES" : "NO"];
      return isAdmin
        ? [e.userName, e.role, e.partNum, e.desc || "", e.purchaseType, e.qty || "", e.scenario || "", cost, ...pricing, e.competitor || "", e.targetPrice || "", e.source || "", e.dateStr || "", e.timestamp || ""]
        : [e.userName, e.partNum, e.desc || "", e.purchaseType, e.qty || "", cost, ...pricing, e.competitor || "", e.targetPrice || "", e.source || "", e.timestamp || ""];
    });
    downloadCSV(`${isAdmin ? "FullAuditExport" : "MyLookups"}_${new Date().toISOString().slice(0, 10)}.csv`, hdr, data);
  }

  const marginNum = parseFloat(desiredMargin) / 100;
  const sellPrice = result && result.cost > 0 && marginNum > 0 && marginNum < 1 ? calcSell(result.cost, marginNum) : null;
  const belowFloor = marginNum > 0 && marginNum < floorMargin;
  const locList = locations.length ? locations : (result?.inventory ? Object.keys(result.inventory) : []);

  // -- Render gates --
  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.navy, fontFamily: "'Segoe UI',system-ui,sans-serif", padding: 24 }}>
        <div style={{ background: T.white, color: T.navy, borderRadius: 12, padding: "28px 32px", maxWidth: 480, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Couldn't load local data</div>
          <div style={{ fontSize: 13, color: T.slate, marginBottom: 18, wordBreak: "break-word" }}>{loadError}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button style={S.btn} onClick={() => { setLoadError(null); loadedRef.current = false; setLoaded(false); reloadData(); }}>Retry</button>
            <button style={{ ...S.btnO, color: T.red, borderColor: T.red }} onClick={async () => { try { await store.clearAll(); } catch (e) { /* ignore */ } location.reload(); }}>Reset all data</button>
          </div>
          <div style={{ fontSize: 11, color: T.slateLight, marginTop: 14 }}>If this keeps happening, fully close any other open window of the app, then Retry.</div>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.navy, color: T.white, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>Loading…</div>;
  }

  if (setup && !currentUser) {
    return (
      <div style={{ minHeight: "100vh", background: T.offwhite, fontFamily: "'Segoe UI',system-ui,sans-serif", padding: "22px 16px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>Data Setup</div>
            <button style={S.btnO} onClick={() => { setSetup(false); reloadData(); }}>← Back to Login</button>
          </div>
          <DataManagement onDataChanged={reloadData} />
          <SettingsPanel settings={settings} onSave={async (s) => { await store.saveSettings(s); setSettings(s); }} />
        </div>
      </div>
    );
  }

  // Guard: if the logged-in user no longer exists (e.g. admin cleared all data
  // while logged in), fall back to the login screen instead of crashing.
  if (!currentUser || !usersById[currentUser]) {
    return <LoginScreen users={users} onSelect={(id) => { setCurrentUser(id); setMode("single"); setDailyUsed(usageToday(log, id)); }} onSetup={() => setSetup(true)} />;
  }

  const user = usersById[currentUser];

  return (
    <div style={{ minHeight: "100vh", background: T.offwhite, fontFamily: "'Segoe UI',system-ui,sans-serif", fontSize: 13, color: T.navy }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${T.navy},${T.navyMid})`, padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div>
          <div style={{ color: T.white, fontSize: 17, fontWeight: 700, letterSpacing: ".04em" }}>BRENNAN INDUSTRIES</div>
          <div style={{ color: "#4A9EFF", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", marginTop: 1 }}>Part Cost Lookup Tool</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <DailyBadge used={dailyUsed} limit={dailyLimit} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: isAdmin ? T.purple : T.tealLight, color: isAdmin ? T.white : T.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{user.initials}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.white }}>{user.name}</div>
              <div style={{ fontSize: 10, color: isAdmin ? "#C4B5FD" : "#5EEAD4" }}>{isAdmin ? "Admin / Leadership" : "Sales Rep"}</div>
            </div>
            <button onClick={() => { setCurrentUser(null); setMode("single"); resetSingle(); resetBulk(); setSessionLog([]); setDailyUsed(0); }} style={{ marginLeft: 6, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 10, cursor: "pointer" }}>Switch</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 16px 40px" }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          {[["single", "Single Lookup"], ["bulk", `Bulk Import (up to ${bulkLimit})`]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); if (m === "single") resetSingle(); else resetBulk(); }}
              style={{ padding: "9px 20px", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer", border: `2px solid ${mode === m ? T.teal : T.lgray}`, background: mode === m ? T.teal : T.white, color: mode === m ? T.white : T.slate }}>{label}</button>
          ))}
          {isAdmin && <button onClick={() => setMode("audit")} style={navBtn(mode === "audit", T.purple)}>Audit Trail</button>}
          {isAdmin && <button onClick={() => setMode("data")} style={navBtn(mode === "data", T.teal)}>Data</button>}
          {isAdmin && <button onClick={() => setMode("settings")} style={navBtn(mode === "settings", T.teal)}>Settings</button>}
          <div style={{ marginLeft: "auto", fontSize: 12, color: remaining <= 10 ? T.red : T.slate, fontWeight: remaining <= 10 ? 700 : 400 }}>
            {remaining > 0 ? `${remaining} lookup${remaining === 1 ? "" : "s"} remaining today` : "Daily limit reached"}
          </div>
        </div>

        {/* Empty-state nudge when no parts loaded */}
        {partsCount === 0 && mode !== "data" && mode !== "settings" && mode !== "audit" && (
          <div style={{ background: T.orangeLight, border: "1px solid #FCD34D", borderRadius: 8, padding: "14px 18px", marginBottom: 18, color: "#92400E", fontSize: 13 }}>
            No parts have been uploaded yet.{" "}
            {isAdmin ? <button onClick={() => setMode("data")} style={{ ...S.btn, background: T.orange, padding: "4px 12px", fontSize: 12, marginLeft: 8 }}>Go to Data</button> : "Ask an admin to upload the parts file."}
          </div>
        )}

        {mode === "audit" && isAdmin && <AuditPanel allLog={log} usersById={usersById} onClearLog={async () => { await store.clearLog(); setSessionLog([]); setSelected({}); await reloadData(); }} />}
        {mode === "data" && isAdmin && <DataManagement onDataChanged={reloadData} />}
        {mode === "settings" && isAdmin && <SettingsPanel settings={settings} onSave={async (s) => { await store.saveSettings(s); setSettings(s); }} />}

        {/* SINGLE MODE */}
        {mode === "single" && (<>
          <div style={{ display: "flex", alignItems: "center", background: T.white, borderRadius: 10, padding: "13px 18px", marginBottom: 18, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            {STEPS.map((st, i) => (
              <div key={st.n} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
                <StepDot n={st.n} active={step === st.n} done={step > st.n} label={st.l} />
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, margin: "0 5px", background: step > st.n ? T.teal : T.lgray }} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div style={S.card}>
              <div style={S.head}>Step 1 - Customer & Part Lookup</div>
              <div style={{ padding: 20 }}>
                {remaining <= 0 && <div style={banner(T.redLight, "#FCA5A5", "#991B1B")}>Daily limit reached. Please try again tomorrow.</div>}
                <div style={{ background: T.offwhite, borderRadius: 8, padding: "14px 16px", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={lblUpper}>Customer Information</div>
                    <button onClick={() => { setIsNewCustomer(!isNewCustomer); setCustomerNum(""); setCustomerName(""); setCustomerError(""); }} style={newCustBtn(isNewCustomer)}>{isNewCustomer ? "New Customer ✓" : "+ New Customer"}</button>
                  </div>
                  {!isNewCustomer ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                      <div>
                        <label style={S.lbl}>Customer Number <span style={{ color: T.red }}>*</span></label>
                        <CustomerNumberInput value={customerNum} onChangeNum={(v) => { setCustomerNum(v); setCustomerError(""); }} onChangeName={setCustomerName} errorBorder={!!customerError} placeholder="Type to search" onSearch={store.searchCustomers} />
                      </div>
                      <div>
                        <label style={S.lbl}>Customer Name <span style={{ color: T.red }}>*</span></label>
                        <input style={{ ...S.input, borderColor: customerError ? T.red : T.lgray }} value={customerName} onChange={(e) => { setCustomerName(e.target.value); setCustomerError(""); }} placeholder="Auto-filled from customer number" />
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "8px 12px", background: T.orangeLight, borderRadius: 6, fontSize: 12, color: "#92400E", fontWeight: 600 }}>New Customer - customer fields bypassed. Pricing history will not be available.</div>
                  )}
                  {customerError && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{customerError}</div>}

                  {!isNewCustomer && (customerNum || customerName) && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: "flex", borderBottom: `2px solid ${T.lgray}` }}>
                        {[["lookup", "Part Lookup"], ["history", `Pricing History${pricingHistory.length > 0 ? " (" + pricingHistory.length + ")" : ""}`]].map(([tab, label]) => (
                          <button key={tab} onClick={() => setHistoryTab(tab)} style={tabBtn(historyTab === tab)}>{label}</button>
                        ))}
                      </div>
                      {historyTab === "history" && (
                        <div style={{ border: `1px solid ${T.lgray}`, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                          <PricingHistoryTab customerName={customerName} customerNum={customerNum} userId={currentUser} allLog={log} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {historyTab === "lookup" && (
                  <>
                    <label style={S.lbl}>Part Number</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <input style={S.input} value={partNum} onChange={(e) => { setPartNum(e.target.value); setPartError(""); }} onKeyDown={(e) => e.key === "Enter" && handleLookup()} placeholder="Enter a part number" disabled={remaining <= 0} />
                      <button style={{ ...S.btn, opacity: remaining <= 0 ? 0.5 : 1 }} onClick={handleLookup} disabled={remaining <= 0}>Look Up</button>
                    </div>
                    {partError && <div style={{ color: T.red, fontSize: 12, marginTop: 6 }}>{partError}</div>}
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && foundPart && (
            <div style={S.card}>
              <div style={S.head}>Step 2 - Purchase Type</div>
              <div style={{ padding: 20 }}>
                <div style={{ background: T.offwhite, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: T.slate }}>Part Found</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginTop: 2 }}>{partNum.toUpperCase()}</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>{foundPart.desc}</div>
                </div>
                <label style={S.lbl}>Spot Buy or Recurring Purchase?</label>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  {[["spot", "Spot Buy"], ["recurring", "Recurring"]].map(([t, label]) => (
                    <button key={t} onClick={() => { setPurchaseType(t); setStep(3); }} style={{ flex: 1, padding: "14px 8px", border: `2px solid ${purchaseType === t ? T.teal : T.lgray}`, borderRadius: 8, background: purchaseType === t ? T.tealLight : T.offwhite, color: purchaseType === t ? T.teal : T.slate, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{label}</button>
                  ))}
                </div>
                <button style={{ ...S.btnO, marginTop: 14, fontSize: 11 }} onClick={() => { setStep(1); setFoundPart(null); }}>← Back</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={S.card}>
              <div style={S.head}>Step 3 - Quantity & Quote Details</div>
              <div style={{ padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div><label style={S.lbl}>Quantity Requested <span style={optTxt}>(optional)</span></label><input style={S.input} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Leave blank if unknown" /></div>
                  <div><label style={S.lbl}>Competitor <span style={optTxt}>(optional)</span></label><CompetitorField value={competitor} onChange={setCompetitor} inputStyle={S.input} competitors={competitors} /></div>
                  <div><label style={S.lbl}>Customer Target Price <span style={optTxt}>(optional)</span></label><input style={S.input} type="number" step="0.01" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="e.g. 1.50" /></div>
                </div>
                <div style={{ background: T.offwhite, borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                  <label style={S.lbl}>Reason for Pricing Request <span style={{ color: T.red }}>*</span></label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: quoteReason === "Other" ? 10 : 0 }}>
                    {QUOTE_REASONS.map((r) => (
                      <button key={r} onClick={() => { setQuoteReason(r); setQuoteReasonError(""); setQuoteReasonOther(""); }} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: "pointer", border: `1.5px solid ${quoteReason === r ? T.teal : T.lgray}`, background: quoteReason === r ? T.tealLight : T.white, color: quoteReason === r ? T.teal : T.slate }}>{r}</button>
                    ))}
                  </div>
                  {quoteReason === "Other" && <input style={{ ...S.input, marginTop: 8 }} value={quoteReasonOther} onChange={(e) => setQuoteReasonOther(e.target.value)} placeholder="Please describe the reason (optional)" />}
                  {quoteReasonError && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{quoteReasonError}</div>}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button style={S.btnO} onClick={() => setStep(2)}>← Back</button>
                  <button style={S.btn} onClick={handleCalc}>Calculate Cost →</button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && result && (<>
            {result.noCost && <div style={banner(T.redLight, "#FCA5A5", "#991B1B")}><strong>There is no available cost for this part.</strong> Please contact the pricing team.</div>}
            <div style={S.card}>
              <div style={S.head}>Results - {result.partNum}</div>
              <div style={{ padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, background: T.offwhite, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                  {[["Description", result.desc], ["Purchase Type", result.purchaseType], ["Qty Requested", result.qty || "Not specified"], ["Total Inventory", `${result.total?.toLocaleString()} units`]].map(([k, v]) => (
                    <div key={k}><div style={kStyle}>{k}</div><div style={vStyle}>{v}</div></div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, background: T.offwhite, borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
                  {[["Customer", result.customerName || "-"], ["Customer #", result.customerNum || "-"], ["Quote Reason", result.quoteReason || "-"]].map(([k, v]) => (
                    <div key={k}><div style={kStyle}>{k}</div><div style={vStyle}>{v}</div></div>
                  ))}
                </div>
                {isAdmin && <div style={{ background: T.tealLight, border: "1px solid #A5F3FC", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}><div style={{ fontSize: 10, color: "#0E7490", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>Cost Logic Path</div><div style={{ fontSize: 12, color: "#164E63", fontWeight: 600 }}>{result.scenario}</div></div>}
                <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18, flexWrap: "wrap" }}>
                  <div style={{ background: result.noCost ? "#FEE2E2" : T.navy, borderRadius: 10, padding: "13px 24px", textAlign: "center", minWidth: 120 }}>
                    <div style={{ fontSize: 10, color: result.noCost ? "#FCA5A5" : T.slateLight, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>Cost</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: result.noCost ? "#991B1B" : T.white }}>{result.noCost ? "N/A" : `$${result.cost.toFixed(4)}`}</div>
                  </div>
                  {result.targetPrice && <div style={costBox}><div style={kStyle}>Target Price</div><div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>${parseFloat(result.targetPrice).toFixed(4)}</div></div>}
                  {result.competitor && <div style={costBox}><div style={kStyle}>Competitor</div><div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>{result.competitor}</div></div>}
                </div>
                {!result.noCost && (
                  <div style={{ background: T.offwhite, border: `1px solid ${T.lgray}`, borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ ...lblUpper, marginBottom: 12 }}>Margin Calculator</div>

                    {/* What margin do we get if the customer pays their target price? */}
                    {result.targetPrice && parseFloat(result.targetPrice) > 0 && result.cost > 0 && (() => {
                      const tp = parseFloat(result.targetPrice);
                      const tpMargin = (tp - result.cost) / tp;
                      const tpBelow = tpMargin < floorMargin;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "10px 14px", background: tpBelow ? T.redLight : T.greenLight, border: `1px solid ${tpBelow ? "#FCA5A5" : "#6EE7B7"}`, borderRadius: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: tpBelow ? "#991B1B" : "#065F46", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Customer Target Price Margin</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: tpBelow ? "#991B1B" : "#065F46", marginTop: 2 }}>{(tpMargin * 100).toFixed(1)}%</div>
                          </div>
                          <div style={{ borderLeft: `1px solid ${tpBelow ? "#FCA5A5" : "#6EE7B7"}`, paddingLeft: 12 }}>
                            {tpBelow
                              ? <div><div style={{ fontSize: 11, color: "#991B1B", fontWeight: 700 }}>Below {Math.round(floorMargin * 100)}% Floor</div><div style={{ fontSize: 10, color: "#7F1D1D", marginTop: 2 }}>Min sell at floor: {fmtSell(calcSell(result.cost, floorMargin))}</div></div>
                              : <div style={{ fontSize: 11, color: "#065F46", fontWeight: 700 }}>Meets minimum margin</div>}
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Desired Margin %</label>
                      {[45, 50, 55].map((pct) => (
                        <button key={pct} onClick={() => setDesiredMargin(String(pct))} style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: "pointer", border: `1.5px solid ${desiredMargin === String(pct) ? T.teal : T.lgray}`, background: desiredMargin === String(pct) ? T.teal : T.white, color: desiredMargin === String(pct) ? T.white : T.slate }}>{pct}%</button>
                      ))}
                      <input style={{ ...S.input, width: 80, textAlign: "center" }} type="number" min="0" max="99" value={desiredMargin} onChange={(e) => setDesiredMargin(e.target.value)} placeholder="or type %" />
                    </div>
                    {sellPrice && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                        <div style={{ background: belowFloor ? T.orangeLight : T.greenLight, border: `1.5px solid ${belowFloor ? "#FCD34D" : "#6EE7B7"}`, borderRadius: 8, padding: "8px 18px", textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: belowFloor ? "#92400E" : "#065F46", textTransform: "uppercase", letterSpacing: ".08em" }}>Sell Price</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: belowFloor ? "#92400E" : "#065F46" }}>{fmtSell(sellPrice)}</div>
                        </div>
                        {belowFloor ? <div style={{ background: T.redLight, border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px" }}><div style={{ fontSize: 11, color: "#991B1B", fontWeight: 700 }}>Below {Math.round(floorMargin * 100)}% Floor</div><div style={{ fontSize: 10, color: "#7F1D1D", marginTop: 2 }}>Min at floor: {fmtSell(calcSell(result.cost, floorMargin))}</div></div> : <span style={S.tag("green")}>Meets floor margin</span>}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ ...lblUpper, marginBottom: 8 }}>Inventory by Location</div>
                  {locList.length === 0 ? (
                    <div style={{ background: T.offwhite, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: T.slate }}>
                      No location-based inventory in the uploaded data. Total on hand: <strong>{(result.total || 0).toLocaleString()}</strong> units.
                    </div>
                  ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr>{locList.map((l) => <th key={l} style={{ background: T.offwhite, padding: "6px 10px", textAlign: "center", color: T.navyMid, fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: `1px solid ${T.lgray}` }}>{l}</th>)}<th style={{ background: T.lgray, padding: "6px 10px", textAlign: "center", fontWeight: 700, fontSize: 11 }}>Total</th></tr></thead>
                      <tbody><tr>{locList.map((l) => { const v = result.inventory?.[l] || 0; return <td key={l} style={{ padding: "6px 10px", textAlign: "center", color: v === 0 ? T.slateLight : T.navy, fontWeight: v > 0 ? 600 : 400 }}>{v.toLocaleString()}</td>; })}<td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: T.navy, background: T.offwhite }}>{result.total?.toLocaleString()}</td></tr></tbody>
                    </table>
                  </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={S.btnO} onClick={() => setStep(3)}>← Back</button>
                  <button style={S.btn} onClick={handleAddToLog}>Save to Log & New Lookup</button>
                </div>
              </div>
            </div>
          </>)}
        </>)}

        {/* BULK MODE */}
        {mode === "bulk" && (<>
          {bulkStep === 1 && (
            <div style={S.card}>
              <div style={S.head}>Bulk Import - Add Up to {bulkLimit} Items at Once</div>
              <div style={{ padding: 20 }}>
                {remaining <= 0 && <div style={banner(T.redLight, "#FCA5A5", "#991B1B")}>Daily limit reached.</div>}
                <div style={{ background: T.offwhite, borderRadius: 8, padding: "14px 16px", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={lblUpper}>Customer Information (applies to entire batch)</div>
                    <button onClick={() => { setBulkIsNewCustomer(!bulkIsNewCustomer); setBulkCustomerNum(""); setBulkCustomerName(""); setBulkCustomerError(""); }} style={newCustBtn(bulkIsNewCustomer)}>{bulkIsNewCustomer ? "New Customer ✓" : "+ New Customer"}</button>
                  </div>
                  {!bulkIsNewCustomer ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                      <div><label style={S.lbl}>Customer Number <span style={{ color: T.red }}>*</span></label><CustomerNumberInput value={bulkCustomerNum} onChangeNum={(v) => { setBulkCustomerNum(v); setBulkCustomerError(""); }} onChangeName={setBulkCustomerName} errorBorder={!!bulkCustomerError} placeholder="Type to search" onSearch={store.searchCustomers} /></div>
                      <div><label style={S.lbl}>Customer Name <span style={{ color: T.red }}>*</span></label><input style={{ ...S.input, borderColor: bulkCustomerError ? T.red : T.lgray }} value={bulkCustomerName} onChange={(e) => { setBulkCustomerName(e.target.value); setBulkCustomerError(""); }} placeholder="Auto-filled from customer number" /></div>
                    </div>
                  ) : <div style={{ padding: "8px 12px", background: T.orangeLight, borderRadius: 6, fontSize: 12, color: "#92400E", fontWeight: 600 }}>New Customer - customer fields bypassed for this batch.</div>}
                  {bulkCustomerError && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{bulkCustomerError}</div>}

                  {!bulkIsNewCustomer && (bulkCustomerNum || bulkCustomerName) && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: "flex", borderBottom: `2px solid ${T.lgray}` }}>
                        {[["input", "Import Items"], ["history", `Pricing History${bulkPricingHistory.length > 0 ? " (" + bulkPricingHistory.length + ")" : ""}`]].map(([tab, label]) => (
                          <button key={tab} onClick={() => setBulkHistoryTab(tab)} style={tabBtn(bulkHistoryTab === tab)}>{label}</button>
                        ))}
                      </div>
                      {bulkHistoryTab === "history" && <div style={{ border: `1px solid ${T.lgray}`, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}><PricingHistoryTab customerName={bulkCustomerName} customerNum={bulkCustomerNum} userId={currentUser} allLog={log} /></div>}
                    </div>
                  )}
                </div>

                {!(!bulkIsNewCustomer && (bulkCustomerNum || bulkCustomerName) && bulkHistoryTab === "history") && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <label style={S.lbl}>Option A - Paste Part Numbers</label>
                      <div style={{ fontSize: 11, color: T.slate, marginBottom: 7 }}>One per line or comma-separated. Max {bulkLimit} items.</div>
                      <textarea style={{ ...S.input, height: 145, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} placeholder={"PART-001\nPART-002"} value={bulkInput} onChange={(e) => { setBulkInput(e.target.value); setBulkFile(null); if (fileRef.current) fileRef.current.value = ""; }} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                        <label style={{ ...S.lbl, marginBottom: 0 }}>Option B - Upload CSV File</label>
                        <button onClick={() => downloadCSV("BulkLookup_Template.csv", ["PartNumber", "QuantityRequested", "PurchaseType", "Competitor", "TargetPrice"], [["PART-001", "500", "SpotBuy", "World Wide", "1.10"]])} style={{ background: T.greenLight, color: "#065F46", border: "1.5px solid #6EE7B7", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Download Template</button>
                      </div>
                      <div style={{ fontSize: 11, color: T.slate, marginBottom: 7 }}>Only Part Number is required — other columns are optional.</div>
                      <div style={{ border: `2px dashed ${bulkFile ? T.teal : T.lgray}`, borderRadius: 8, padding: "28px 16px", textAlign: "center", background: bulkFile ? T.tealLight : T.offwhite, cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
                        <div style={{ fontSize: 12, color: bulkFile ? T.teal : T.slate, fontWeight: bulkFile ? 700 : 400 }}>{bulkFile ? `${bulkFile.name} loaded - click to replace` : "Click to choose a .CSV file"}</div>
                        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFile} />
                      </div>
                    </div>
                  </div>
                )}
                {bulkError && <div style={banner(T.redLight, "#FCA5A5", "#991B1B")}>{bulkError}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button style={S.btnO} onClick={() => { setBulkInput(""); setBulkFile(null); setBulkError(""); if (fileRef.current) fileRef.current.value = ""; }}>Clear</button>
                  <button style={{ ...S.btn, opacity: remaining <= 0 ? 0.5 : 1 }} onClick={handleBulkParse} disabled={remaining <= 0}>Parse Items →</button>
                </div>
              </div>
            </div>
          )}

          {bulkStep === 2 && bulkRows.length > 0 && (
            <div style={S.card}>
              <div style={S.head}><span>Review & Configure - {bulkRows.length} item{bulkRows.length === 1 ? "" : "s"}</span><button style={{ background: "rgba(255,255,255,0.15)", color: T.white, border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 11, cursor: "pointer" }} onClick={resetBulk}>Start Over</button></div>
              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, background: T.offwhite, borderRadius: 8, padding: "10px 14px", marginBottom: 10, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.navy }}><input type="checkbox" checked={bulkApplyType} onChange={(e) => handleApplyAll(e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer" }} />Apply one purchase type to all items:</label>
                  {[["spot", "Spot Buy"], ["recurring", "Recurring"]].map(([t, l]) => (<button key={t} onClick={() => handleAllTypeChange(t)} style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, borderRadius: 5, cursor: "pointer", border: `1.5px solid ${bulkAllType === t ? T.teal : T.lgray}`, background: bulkAllType === t ? T.teal : T.white, color: bulkAllType === t ? T.white : T.slate }}>{l}</button>))}
                  <div style={{ marginLeft: "auto", fontSize: 12, color: T.slate }}>{validBulk} valid · {bulkRows.filter((r) => r.error).length} with errors</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, background: T.offwhite, borderRadius: 8, padding: "10px 14px", marginBottom: 14, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.navy }}><input type="checkbox" checked={bulkApplyReason} onChange={(e) => handleApplyAllReason(e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer" }} />Apply one quote reason to all items:</label>
                  <select value={bulkAllReason} onChange={(e) => handleAllReasonChange(e.target.value)} style={{ ...S.input, width: "auto", padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>
                    <option value="">-- Select reason --</option>
                    {QUOTE_REASONS.filter((r) => r !== "Other").map((r) => <option key={r} value={r}>{r}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: T.slate }}>A quote reason is required for every item.</div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr style={{ background: T.offwhite }}>{["#", "Part / Description", "Purchase Type", "Qty", "Competitor", "Target Price", "Quote Reason"].map((h) => <th key={h} style={{ padding: "8px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `2px solid ${T.lgray}` }}>{h}</th>)}</tr></thead>
                    <tbody>{bulkRows.map((row, idx) => <BulkRowEditor key={idx} row={row} idx={idx} applyAllType={bulkApplyType} applyAllReason={bulkApplyReason} competitors={competitors} onUpdate={(i, f, v) => setBulkRows((prev) => prev.map((r, ri) => (ri === i ? { ...r, [f]: v } : r)))} />)}</tbody>
                  </table>
                </div>
                {bulkError && <div style={banner(T.redLight, "#FCA5A5", "#991B1B")}>{bulkError}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
                  <button style={S.btnO} onClick={() => setBulkStep(1)}>← Back</button>
                  <button style={S.btn} onClick={handleBulkRun}>Run {validBulk} Lookup{validBulk === 1 ? "" : "s"} →</button>
                  <div style={{ fontSize: 12, color: validBulk > remaining ? T.red : T.slate }}>Uses {validBulk} of your {remaining} remaining{validBulk > remaining ? " - exceeds limit" : ""}</div>
                </div>
              </div>
            </div>
          )}

          {bulkStep === 3 && bulkResults && (
            <div style={S.card}>
              <div style={S.head}><span>Bulk Results - {bulkResults.length} item{bulkResults.length === 1 ? "" : "s"} · {bulkResults.filter((r) => r.noCost).length} with no cost</span><button style={{ background: "rgba(255,255,255,0.15)", color: T.white, border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 11, cursor: "pointer" }} onClick={resetBulk}>New Bulk Import</button></div>
              <GlobalMarginBar ids={bulkEligibleIds} margins={bulkMargins} setMargins={setBulkMarginsSynced} />
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: T.offwhite }}>{(isAdmin ? ["Part #", "Description", "Type", "Qty", "Cost Logic", "Cost", "Margin %", "Sell Price", "Competitor", "Target $", "Flag"] : ["Part #", "Description", "Type", "Qty", "Cost", "Margin %", "Sell Price", "Competitor", "Target $", "Flag"]).map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `2px solid ${T.lgray}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                  <tbody>{bulkResults.map((r, idx) => <BulkResultRow key={r.id} r={r} idx={idx} margin={bulkMargins[r.id] || ""} onMarginChange={(id, val) => setBulkMarginsSynced((prev) => ({ ...prev, [id]: val }))} isAdmin={isAdmin} floorMargin={floorMargin} />)}</tbody>
                </table>
              </div>
              <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.lgray}`, display: "flex", gap: 10 }}>
                <button style={S.btnO} onClick={() => setBulkStep(2)}>← Back to Edit</button>
                <button style={{ ...S.btnO, color: T.slate, borderColor: T.lgray }} onClick={resetBulk}>Start New Import</button>
              </div>
            </div>
          )}
        </>)}

        {/* SESSION LOG */}
        {sessionLog.length > 0 && mode !== "audit" && mode !== "data" && mode !== "settings" && (
          <div style={S.card}>
            <div style={S.head}>
              <span>{isAdmin ? "Your Session Log (this session only)" : "My Lookups Today"} - {sessionLog.length} entr{sessionLog.length === 1 ? "y" : "ies"}</span>
              <button style={{ background: T.teal, color: T.white, border: "none", borderRadius: 5, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: anySelected ? 1 : 0.45 }} onClick={handleExport} disabled={!anySelected}>Export Selected (.CSV)</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={{ padding: "7px 10px", borderBottom: `2px solid ${T.lgray}`, width: 32, textAlign: "center" }}><input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} style={{ cursor: "pointer" }} /></th>
                    {(isAdmin ? ["Part #", "Description", "Type", "Qty", "Cost Logic", "Cost", "Sell Price", "Competitor", "Target $", "Source", "Time"] : ["Part #", "Description", "Type", "Qty", "Cost", "Sell Price", "Competitor", "Target $", "Source", "Time"]).map((h) => <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.slate, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `2px solid ${T.lgray}`, whiteSpace: "nowrap" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sessionLog.map((e, idx) => (
                    <tr key={e.id} style={{ background: selected[e.id] ? T.tealLight : idx % 2 === 0 ? T.white : "#FAFBFC", borderBottom: `1px solid ${T.offwhite}` }}>
                      <td style={{ padding: "6px 10px", textAlign: "center" }}><input type="checkbox" checked={!!selected[e.id]} onChange={(ev) => handleSelectOne(e.id, ev.target.checked)} style={{ cursor: "pointer" }} /></td>
                      <td style={{ padding: "6px 10px", fontWeight: 700, color: T.navy, whiteSpace: "nowrap" }}>{e.partNum}</td>
                      <td style={{ padding: "6px 10px", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.slate }}>{e.desc}</td>
                      <td style={{ padding: "6px 10px", textTransform: "capitalize" }}>{e.purchaseType}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center" }}>{e.qty || "-"}</td>
                      {isAdmin && <td style={{ padding: "6px 10px", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0E7490", fontSize: 10 }}>{e.scenario}</td>}
                      <td style={{ padding: "6px 10px", fontWeight: 700 }}>{e.noCost ? <span style={S.tag("red")}>No Cost</span> : `$${e.cost.toFixed(4)}`}</td>
                      <td style={{ padding: "6px 10px", color: "#065F46", fontWeight: 600 }}>{e.sellPrice ? fmtSell(e.sellPrice) : "-"}</td>
                      <td style={{ padding: "6px 10px", color: T.slate }}>{e.competitor || "-"}</td>
                      <td style={{ padding: "6px 10px", color: T.slate }}>{e.targetPrice ? `$${parseFloat(e.targetPrice).toFixed(2)}` : "-"}</td>
                      <td style={{ padding: "6px 10px" }}><span style={{ ...S.tag(e.source === "bulk" ? "orange" : "green"), fontSize: 10 }}>{e.source}</span></td>
                      <td style={{ padding: "6px 10px", color: T.slateLight }}>{e.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Small style helpers --
const navBtn = (on, color) => ({ padding: "9px 20px", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer", border: `2px solid ${on ? color : T.lgray}`, background: on ? color : T.white, color: on ? T.white : T.slate });
const banner = (bg, border, color) => ({ background: bg, border: `1px solid ${border}`, borderRadius: 7, padding: "10px 14px", margin: "10px 0", color, fontWeight: 600 });
const lblUpper = { fontSize: 11, fontWeight: 700, color: T.navyMid, textTransform: "uppercase", letterSpacing: ".06em" };
const optTxt = { color: T.slateLight, fontWeight: 400, textTransform: "none" };
const tabBtn = (on) => ({ padding: "7px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", borderBottom: `2px solid ${on ? T.teal : "transparent"}`, background: "transparent", color: on ? T.teal : T.slate, marginBottom: -2 });
const kStyle = { fontSize: 10, color: T.slateLight, textTransform: "uppercase", letterSpacing: ".08em" };
const vStyle = { fontSize: 13, fontWeight: 600, color: T.navy, marginTop: 2, textTransform: "capitalize" };
const costBox = { background: T.offwhite, border: `1px solid ${T.lgray}`, borderRadius: 10, padding: "13px 24px", textAlign: "center" };
const newCustBtn = (on) => ({ padding: "4px 12px", fontSize: 11, fontWeight: 700, borderRadius: 5, cursor: "pointer", border: `1.5px solid ${on ? T.orange : T.lgray}`, background: on ? T.orangeLight : T.white, color: on ? "#92400E" : T.slate });
