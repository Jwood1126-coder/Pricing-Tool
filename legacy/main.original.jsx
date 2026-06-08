import React, { useState, useRef, useMemo } from "react";

// -- Users ---------------------------------------------------------------------
const USERS = {
  "mscrima":   { name:"Michael Scrima",  title:"CFO",           role:"admin",    initials:"MS" },
  "jdavis":    { name:"James Davis",     title:"Sales Rep",     role:"rep",      initials:"JD" },
  "kpatel":    { name:"Kiran Patel",     title:"Sales Rep",     role:"rep",      initials:"KP" },
  "lwilson":   { name:"Laura Wilson",    title:"Sales Manager", role:"admin",    initials:"LW" },
  "tmorgan":   { name:"Tyler Morgan",    title:"Sales Rep",     role:"rep",      initials:"TM" },
};


// -- Quote Reasons ------------------------------------------------------------
const QUOTE_REASONS = [
  "Existing Customer",
  "New Business",
  "Large Volume Opportunity",
  "Quote Against Competition",
  "Other",
];

// -- Customer seed data (for pricing history demo) -----------------------------
// NOTE FOR NETSUITE DEVELOPER:
// Replace this static object with a live N/search query on the Customer record.
// On customerNum input change, call a Suitelet endpoint that runs:
//   search.create({ type: search.Type.CUSTOMER,
//     filters: [['entityid','startswith', query]],
//     columns: ['entityid','companyname'] }).run().getRange({start:0,end:10})
// Return results as JSON and populate suggestions from that response.
const CUSTOMER_DB = {
  "C-1001": { name:"Acme Industrial Supply"      },
  "C-1002": { name:"Midwest Hydraulics Co."      },
  "C-1003": { name:"Great Lakes Fittings"        },
  "C-1004": { name:"Delta Fluid Systems"         },
  "C-1005": { name:"Summit Equipment Corp."      },
  "C-1006": { name:"Apex Fluid Power Inc."       },
  "C-1007": { name:"Central Hose & Fittings"     },
  "C-1008": { name:"Crown Industrial Supply"     },
  "C-1009": { name:"Continental Equipment Co."   },
  "C-1010": { name:"Diamond Hydraulic Systems"   },
  "C-2001": { name:"First Choice Industrial"     },
  "C-2002": { name:"Forged Components LLC"       },
  "C-2003": { name:"Frontier Fluid Systems"      },
  "C-3001": { name:"Global Hose & Supply"        },
  "C-3002": { name:"Granite State Equipment"     },
  "C-4001": { name:"Harbor Industrial Corp."     },
  "C-4002": { name:"Heartland Hydraulics"        },
  "C-5001": { name:"Iron Works Supply Co."       },
  "C-5002": { name:"Interstate Fluid Power"      },
};

// -- Competitors ---------------------------------------------------------------
const COMPETITORS = [
  "World Wide",
  "Tompkins",
  "Fittings Unlimited",
  "Parker",
  "Air-Way",
  "Fairview",
  "Future Hydraulics",
  "OM",
  "Other",
];

// Reusable competitor dropdown + "Other" write-in field
function CompetitorField({ value, onChange, inputStyle, compact=false }) {
  const isOther  = value !== "" && !COMPETITORS.slice(0,-1).includes(value);
  const selVal   = isOther ? "Other" : value;

  function handleSelect(e) {
    const v = e.target.value;
    if (v === "Other") onChange("Other");
    else               onChange(v);
  }

  function handleWriteIn(e) {
    onChange(e.target.value);
  }

  const baseSelect = {
    ...inputStyle,
    appearance:"none", WebkitAppearance:"none",
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat:"no-repeat",
    backgroundPosition:"right 10px center",
    paddingRight:28,
    cursor:"pointer",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <select value={selVal} onChange={handleSelect} style={baseSelect}>
        <option value="">- Select competitor -</option>
        {COMPETITORS.map(c=>(
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      {selVal === "Other" && (
        <input
          style={{ ...inputStyle, marginTop:0 }}
          type="text"
          placeholder="Enter competitor name"
          value={isOther && value !== "Other" ? value : ""}
          onChange={handleWriteIn}
        />
      )}
    </div>
  );
}

// -- Mock Data -----------------------------------------------------------------
const PARTS_DB = {
  "BRN-4820-SS": { desc:"Stainless Steel Hex Bolt 1/2-13 x 2",       avgCost:0.84, repCost:1.12, inventory:{PC10:412,PC20:88, PC30:0,  PC35:54, PC37:22,PC40:310,PC50:0,  PC60:145} },
  "BRN-7731-CF": { desc:"Carbon Fiber Washer 3/8 ID",                 avgCost:2.15, repCost:2.98, inventory:{PC10:0,  PC20:0,  PC30:12, PC35:8,  PC37:0, PC40:0,  PC50:3,  PC60:0  } },
  "BRN-1155-AL": { desc:"Aluminum Flat Bar 1x1/8 x 6ft",              avgCost:6.42, repCost:8.10, inventory:{PC10:230,PC20:175,PC30:90, PC35:0,  PC37:44,PC40:200,PC50:88, PC60:120} },
  "BRN-3390-BR": { desc:"Brass Compression Fitting 1/4 NPT",          avgCost:3.77, repCost:4.55, inventory:{PC10:55, PC20:20, PC30:0,  PC35:14, PC37:0, PC40:30, PC50:8,  PC60:12 } },
  "BRN-9002-TI": { desc:"Titanium Grade 5 Rod 1/2 Dia x 12in",        avgCost:0,    repCost:0,    inventory:{PC10:0,  PC20:0,  PC30:0,  PC35:0,  PC37:0, PC40:0,  PC50:0,  PC60:0  } },
  "BRN-5544-ST": { desc:"Steel Threaded Rod 3/8-16 x 36in",           avgCost:4.20, repCost:5.60, inventory:{PC10:18, PC20:6,  PC30:4,  PC35:0,  PC37:0, PC40:22, PC50:10, PC60:5  } },
  "BRN-2287-NN": { desc:"Nylon Hex Nut 1/4-20",                       avgCost:0.18, repCost:0,    inventory:{PC10:980,PC20:450,PC30:200,PC35:120,PC37:88,PC40:560,PC50:330,PC60:210} },
  "BRN-6610-CU": { desc:"Copper Bushing 1/2 OD x 3/8 ID",            avgCost:1.33, repCost:1.75, inventory:{PC10:66, PC20:40, PC30:20, PC35:0,  PC37:10,PC40:55, PC50:22, PC60:14 } },
  "BRN-8821-ZP": { desc:"Zinc Plated Flat Washer 5/16",               avgCost:0.06, repCost:0.09, inventory:{PC10:2400,PC20:1800,PC30:900,PC35:500,PC37:300,PC40:2100,PC50:750,PC60:620} },
  "BRN-0044-PH": { desc:"Phosphate Coated Socket Head Cap Screw 1/4", avgCost:0.22, repCost:0.31, inventory:{PC10:800,PC20:300,PC30:0,  PC35:90, PC37:44,PC40:500,PC50:120,PC60:200} },
};

const LOCATIONS    = ["PC10","PC20","PC30","PC35","PC37","PC40","PC50","PC60"];
const FLOOR_MARGIN = 0.40;
const DAILY_LIMIT  = 100;
const BULK_LIMIT   = 25;

// -- Seed historical audit data ------------------------------------------------
function makeDate(daysAgo, h=10, m=0) {
  const d = new Date(); d.setDate(d.getDate()-daysAgo);
  d.setHours(h,m,0,0); return d;
}
const SEED_LOG = [
  { id:"s1",  userId:"jdavis",  partNum:"BRN-4820-SS", purchaseType:"spot",      qty:200,  cost:0.84,  noCost:false, scenario:"Spot Buy -> Inv 516% of qty (70%+) -> Average Cost",    competitor:"World Wide",      targetPrice:"1.10", desiredMarginPct:"45.0", sellPrice:1.527, belowFloor:false, source:"single", customerNum:"C-1001", customerName:"Acme Industrial Supply",  quoteReason:"Quote Against Competition", date:makeDate(1,9,14)  },
  { id:"s2",  userId:"kpatel",  partNum:"BRN-1155-AL", purchaseType:"recurring", qty:null, cost:8.10,  noCost:false, scenario:"Recurring -> Replacement Cost",                          competitor:"",               targetPrice:"",     desiredMarginPct:"42.0", sellPrice:13.97, belowFloor:false, source:"single", customerNum:"C-1002", customerName:"Midwest Hydraulics Co.",  quoteReason:"Existing Customer",         date:makeDate(1,10,32) },
  { id:"s3",  userId:"tmorgan", partNum:"BRN-9002-TI", purchaseType:"spot",      qty:50,   cost:0,     noCost:true,  scenario:"No cost available in system",                           competitor:"Parker",          targetPrice:"22.00",desiredMarginPct:null,   sellPrice:null,  belowFloor:false, source:"single", customerNum:"C-1003", customerName:"Great Lakes Fittings",    quoteReason:"New Business",              date:makeDate(1,11,5)  },
  { id:"s4",  userId:"jdavis",  partNum:"BRN-3390-BR", purchaseType:"spot",      qty:100,  cost:4.55,  noCost:false, scenario:"Spot Buy -> Inv 139% of qty (70%+) -> Average Cost",    competitor:"",               targetPrice:"5.50", desiredMarginPct:"38.0", sellPrice:7.339, belowFloor:true,  source:"bulk",   customerNum:"C-1001", customerName:"Acme Industrial Supply",  quoteReason:"Large Volume Opportunity",  date:makeDate(2,8,45)  },
  { id:"s5",  userId:"kpatel",  partNum:"BRN-2287-NN", purchaseType:"spot",      qty:500,  cost:0.18,  noCost:false, scenario:"Spot Buy -> Inv 593% of qty (70%+) -> Average Cost",    competitor:"OM",              targetPrice:"0.28", desiredMarginPct:"50.0", sellPrice:0.360, belowFloor:false, source:"bulk",   customerNum:"C-1005", customerName:"Summit Equipment Corp.",  quoteReason:"Quote Against Competition", date:makeDate(2,14,20) },
  { id:"s6",  userId:"tmorgan", partNum:"BRN-8821-ZP", purchaseType:"recurring", qty:null, cost:0.09,  noCost:false, scenario:"Recurring -> Replacement Cost",                          competitor:"",               targetPrice:"",     desiredMarginPct:"44.0", sellPrice:0.161, belowFloor:false, source:"single", customerNum:"C-1003", customerName:"Great Lakes Fittings",    quoteReason:"Existing Customer",         date:makeDate(3,9,0)   },
  { id:"s7",  userId:"jdavis",  partNum:"BRN-5544-ST", purchaseType:"spot",      qty:80,   cost:5.60,  noCost:false, scenario:"Spot Buy -> Inv 81% of qty (<70%) -> Replacement Cost", competitor:"Tompkins",        targetPrice:"7.00", desiredMarginPct:"41.0", sellPrice:9.492, belowFloor:false, source:"single", customerNum:"C-1004", customerName:"Delta Fluid Systems",     quoteReason:"Quote Against Competition", date:makeDate(3,15,10) },
  { id:"s8",  userId:"kpatel",  partNum:"BRN-7731-CF", purchaseType:"spot",      qty:30,   cost:2.98,  noCost:false, scenario:"Spot Buy -> Inv 77% of qty (<70%) -> Replacement Cost", competitor:"Air-Way",         targetPrice:"3.75", desiredMarginPct:"35.0", sellPrice:4.585, belowFloor:true,  source:"bulk",   customerNum:"C-1002", customerName:"Midwest Hydraulics Co.",  quoteReason:"Large Volume Opportunity",  date:makeDate(5,10,55) },
  { id:"s9",  userId:"tmorgan", partNum:"BRN-0044-PH", purchaseType:"recurring", qty:null, cost:0.31,  noCost:false, scenario:"Recurring -> Replacement Cost",                          competitor:"",               targetPrice:"0.45", desiredMarginPct:"46.0", sellPrice:0.574, belowFloor:false, source:"single", customerNum:"C-1003", customerName:"Great Lakes Fittings",    quoteReason:"Existing Customer",         date:makeDate(6,13,30) },
  { id:"s10", userId:"jdavis",  partNum:"BRN-6610-CU", purchaseType:"spot",      qty:null, cost:1.33,  noCost:false, scenario:"Spot Buy -> No Qty -> 267 units (100+ units) -> Average Cost", competitor:"Future Hydraulics",targetPrice:"1.80", desiredMarginPct:"43.0", sellPrice:2.333, belowFloor:false, source:"single", customerNum:"C-1001", customerName:"Acme Industrial Supply",  quoteReason:"Quote Against Competition", date:makeDate(7,9,20)  },
  { id:"s11", userId:"kpatel",  partNum:"BRN-4820-SS", purchaseType:"spot",      qty:600,  cost:1.12,  noCost:false, scenario:"Spot Buy -> Inv 86% of qty (<70%) -> Replacement Cost", competitor:"",               targetPrice:"",     desiredMarginPct:"40.0", sellPrice:1.867, belowFloor:false, source:"bulk",   customerNum:"C-1005", customerName:"Summit Equipment Corp.",  quoteReason:"Large Volume Opportunity",  date:makeDate(8,11,0)  },
  { id:"s12", userId:"tmorgan", partNum:"BRN-9002-TI", purchaseType:"recurring", qty:null, cost:0,     noCost:true,  scenario:"No cost available in system",                           competitor:"Fairview",        targetPrice:"18.00",desiredMarginPct:null,   sellPrice:null,  belowFloor:false, source:"single", customerNum:"C-1003", customerName:"Great Lakes Fittings",    quoteReason:"New Business",              date:makeDate(10,14,15)},
].map(e=>({ ...e, desc:PARTS_DB[e.partNum]?.desc||"", timestamp:e.date.toLocaleTimeString(), dateStr:e.date.toLocaleDateString() }));

// -- Helpers -------------------------------------------------------------------
function totalInv(inv) { return Object.values(inv).reduce((a,b)=>a+b,0); }
function calcSell(cost, margin) { return (margin>0&&margin<1) ? cost/(1-margin) : null; }
function fmtSell(n) { return `$${n.toFixed(4)}`; }

// Strip non-ASCII characters from strings before writing to CSV
function csvSafe(str) {
  if (!str) return "";
  return str
    .replace(/->/g, "->")
    .replace(/>=/g, ">=")
    .replace(/<=/g, "<=")
    .replace(/-/g, "-")
    .replace(/[-]/g, "");
}

function buildScenario(part, purchaseType, qty) {
  const total=totalInv(part.inventory), hasAvg=part.avgCost>0, hasRep=part.repCost>0;
  if (!hasAvg&&!hasRep) return {cost:0,noCost:true,scenario:"No cost available in system",total};
  if (purchaseType==="recurring") {
    if (!hasRep) return {cost:0,noCost:true,scenario:"Recurring - No Replacement Cost on record",total};
    return {cost:part.repCost,noCost:false,scenario:"Recurring -> Replacement Cost",total};
  }
  const qtyNum=qty?parseInt(qty,10):null;
  if (qtyNum&&qtyNum>0) {
    const pct=total/qtyNum;
    if (pct>=0.70) { if (!hasAvg) return {cost:0,noCost:true,scenario:`Spot Buy - Inv ${(pct*100).toFixed(0)}% of qty - No Average Cost`,total}; return {cost:part.avgCost,noCost:false,scenario:`Spot Buy -> Inv ${(pct*100).toFixed(0)}% of qty (70%+) -> Average Cost`,total}; }
    else            { if (!hasRep) return {cost:0,noCost:true,scenario:`Spot Buy - Inv ${(pct*100).toFixed(0)}% of qty - No Replacement Cost`,total}; return {cost:part.repCost,noCost:false,scenario:`Spot Buy -> Inv ${(pct*100).toFixed(0)}% of qty (<70%) -> Replacement Cost`,total}; }
  } else {
    if (total>=100) { if (!hasAvg) return {cost:0,noCost:true,scenario:`Spot Buy - ${total} units on hand - No Average Cost`,total}; return {cost:part.avgCost,noCost:false,scenario:`Spot Buy -> No Qty -> ${total} units (100+ units) -> Average Cost`,total}; }
    else            { if (!hasRep) return {cost:0,noCost:true,scenario:`Spot Buy - ${total} units on hand - No Replacement Cost`,total}; return {cost:part.repCost,noCost:false,scenario:`Spot Buy -> No Qty -> ${total} units (<100) -> Replacement Cost`,total}; }
  }
}

// -- Style tokens --------------------------------------------------------------
const T = {
  navy:"#0F2744", navyMid:"#1A3F6F", teal:"#028090", tealLight:"#EFF9FB",
  green:"#059669", greenLight:"#D1FAE5", red:"#DC2626", redLight:"#FEE2E2",
  orange:"#D97706", orangeLight:"#FEF3C7", slate:"#64748B", slateLight:"#94A3B8",
  lgray:"#E2E8F0", offwhite:"#F0F4F8", white:"#FFFFFF", purple:"#7C3AED",
};
const S = {
  card:  { background:T.white, borderRadius:10, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", marginBottom:20, overflow:"hidden" },
  head:  { background:`linear-gradient(90deg,${T.navy},${T.navyMid})`, color:T.white, padding:"11px 18px", fontSize:12, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", display:"flex", alignItems:"center", justifyContent:"space-between" },
  input: { width:"100%", padding:"8px 11px", border:`1.5px solid ${T.lgray}`, borderRadius:6, fontSize:13, color:T.navy, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  btn:   { background:T.teal, color:T.white, border:"none", borderRadius:6, padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer" },
  btnO:  { background:"transparent", color:T.teal, border:`1.5px solid ${T.teal}`, borderRadius:6, padding:"7px 16px", fontSize:13, fontWeight:700, cursor:"pointer" },
  lbl:   { fontSize:11, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5, display:"block" },
  tag:   (c)=>({ display:"inline-block", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700,
    background:c==="green"?T.greenLight:c==="red"?T.redLight:c==="orange"?T.orangeLight:c==="purple"?"#EDE9FE":T.lgray,
    color:c==="green"?"#065F46":c==="red"?"#991B1B":c==="orange"?"#92400E":c==="purple"?"#5B21B6":"#475569" }),
};


// -- CustomerNumberInput -------------------------------------------------------
// Autocomplete customer number field with live suggestions + name autofill.
// In NetSuite, replace the CUSTOMER_DB lookup with a live N/search call.
function CustomerNumberInput({ value, onChangeNum, onChangeName, nameValue, errorBorder, placeholder }) {
  const [suggestions, setSuggestions] = React.useState([]);
  const [open, setOpen]               = React.useState(false);
  const wrapRef                       = React.useRef(null);

  // Filter suggestions from CUSTOMER_DB (replace with NetSuite search in production)
  function getSuggestions(q) {
    if (!q || q.length < 1) return [];
    const ql = q.toLowerCase();
    return Object.entries(CUSTOMER_DB)
      .filter(([id, c]) =>
        id.toLowerCase().startsWith(ql) ||
        id.toLowerCase().includes(ql) ||
        c.name.toLowerCase().includes(ql)
      )
      .slice(0, 8)
      .map(([id, c]) => ({ id, name: c.name }));
  }

  function handleInput(e) {
    const q = e.target.value;
    onChangeNum(q);
    const s = getSuggestions(q);
    setSuggestions(s);
    setOpen(s.length > 0);
    // If no match, clear name
    if (!CUSTOMER_DB[q.toUpperCase()] && !CUSTOMER_DB[q]) onChangeName("");
  }

  function handleSelect(id, name) {
    onChangeNum(id);
    onChangeName(name);
    setSuggestions([]);
    setOpen(false);
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <input
        style={{ width:"100%", padding:"8px 11px", border:`1.5px solid ${errorBorder?T.red:open?T.teal:T.lgray}`, borderRadius:6, fontSize:13, color:T.navy, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
        value={value}
        onChange={handleInput}
        onFocus={()=>{ const s=getSuggestions(value); if(s.length) { setSuggestions(s); setOpen(true); } }}
        placeholder={placeholder||"e.g. C-1001"}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:999, background:T.white, border:`1.5px solid ${T.teal}`, borderTop:"none", borderRadius:"0 0 8px 8px", boxShadow:"0 4px 16px rgba(0,0,0,0.12)", maxHeight:220, overflowY:"auto" }}>
          {suggestions.map(s => (
            <div key={s.id} onMouseDown={()=>handleSelect(s.id, s.name)}
              style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${T.lgray}`, display:"flex", gap:12, alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background=T.tealLight}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{ fontWeight:700, color:T.navy, fontSize:12, minWidth:70 }}>{s.id}</span>
              <span style={{ fontSize:12, color:T.slate }}>{s.name}</span>
            </div>
          ))}
          <div style={{ padding:"6px 12px", fontSize:10, color:T.slateLight, borderTop:`1px solid ${T.lgray}`, fontStyle:"italic" }}>
            NetSuite live search will replace this in production
          </div>
        </div>
      )}
    </div>
  );
}


// -- GlobalMarginBar -----------------------------------------------------------
function GlobalMarginBar({ ids, margins, setMargins }) {
  const [globalVal, setGlobalVal] = useState("");
  const filled = ids.filter(id=>margins[id]).length;
  function applyToEmpty() { const v=globalVal.trim(); if (!v) return; setMargins(prev=>{ const u={...prev}; ids.forEach(id=>{ if (!prev[id]) u[id]=v; }); return u; }); }
  function overrideAll()  { const v=globalVal.trim(); if (!v) return; setMargins(prev=>{ const u={...prev}; ids.forEach(id=>{ u[id]=v; }); return u; }); }
  function clearAll()     { setMargins(prev=>{ const u={...prev}; ids.forEach(id=>{ u[id]=""; }); return u; }); setGlobalVal(""); }
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, background:T.offwhite, borderBottom:`1px solid ${T.lgray}`, padding:"10px 16px", flexWrap:"wrap" }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".06em" }}>Apply Margin to All</div>
      {[45,50,55].map(pct=>(
        <button key={pct} onClick={()=>setGlobalVal(String(pct))}
          style={{ padding:"5px 12px", fontSize:11, fontWeight:700, borderRadius:6, cursor:"pointer", border:`1.5px solid ${globalVal===String(pct)?T.teal:T.lgray}`, background:globalVal===String(pct)?T.teal:T.white, color:globalVal===String(pct)?T.white:T.slate, transition:"all .15s" }}>
          {pct}%
        </button>
      ))}
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <input style={{ ...S.input, width:72, textAlign:"center", padding:"5px 8px", fontSize:12 }} type="number" min="0" max="99" step="1" placeholder="or type %" value={globalVal} onChange={e=>setGlobalVal(e.target.value)} />
        <span style={{ fontSize:12, color:T.slate }}>%</span>
      </div>
      <button onClick={applyToEmpty} style={{ ...S.btn, padding:"5px 14px", fontSize:11, background:T.navyMid }} title="Apply only to rows without a margin">Apply to Empty Rows</button>
      <button onClick={overrideAll}  style={{ ...S.btn, padding:"5px 14px", fontSize:11 }} title="Replace ALL row margins">Override All Rows</button>
      <button onClick={clearAll}     style={{ ...S.btnO, padding:"5px 12px", fontSize:11 }}>Clear All</button>
      <div style={{ fontSize:11, color:T.slate, marginLeft:"auto" }}>{filled}/{ids.length} rows have a margin</div>
    </div>
  );
}

// -- DailyBadge ----------------------------------------------------------------
function DailyBadge({ used }) {
  const pct=used/DAILY_LIMIT, remaining=DAILY_LIMIT-used;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 14px" }}>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>Daily</div>
      <div style={{ position:"relative", width:70, height:5, background:"rgba(255,255,255,0.2)", borderRadius:3 }}>
        <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${Math.min(pct*100,100)}%`, background:pct>=1?"#FCA5A5":pct>=0.8?"#FCD34D":"#5EEAD4", borderRadius:3, transition:"width .4s" }} />
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:pct>=1?"#FCA5A5":pct>=0.8?"#FCD34D":"#fff" }}>{used}/{DAILY_LIMIT}</div>
      {remaining>0&&remaining<=10 && <div style={{ fontSize:11, color:"#FCD34D", fontWeight:600 }}> {remaining} left</div>}
      {remaining<=0 && <div style={{ fontSize:11, color:"#FCA5A5", fontWeight:600 }}>Limit reached</div>}
    </div>
  );
}

// -- StepDot -------------------------------------------------------------------
function StepDot({ n, active, done, label }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:done?T.teal:active?T.navy:T.lgray, border:active?`2px solid ${T.teal}`:"2px solid transparent", color:(done||active)?T.white:T.slateLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, transition:"all .3s" }}>{done?"":n}</div>
      <div style={{ fontSize:10, color:T.slate, whiteSpace:"nowrap" }}>{label}</div>
    </div>
  );
}

// -- BulkRowEditor -------------------------------------------------------------
function BulkRowEditor({ row, idx, applyAllType, applyAllReason, onUpdate }) {
  const part=PARTS_DB[row.partNum];
  return (
    <tr style={{ background:row.error?T.redLight:T.white, borderBottom:`1px solid ${T.lgray}` }}>
      <td style={{ padding:"7px 8px", textAlign:"center", color:T.slate, fontSize:12, width:28 }}>{idx+1}</td>
      <td style={{ padding:"7px 8px", minWidth:150 }}>
        <div style={{ fontSize:12, fontWeight:700, color:row.error?T.red:T.navy }}>{row.partNum}</div>
        {part && <div style={{ fontSize:10, color:T.slate, marginTop:1 }}>{part.desc}</div>}
        {row.error && <div style={{ fontSize:10, color:T.red, marginTop:1 }}> {row.error}</div>}
      </td>
      <td style={{ padding:"7px 8px", minWidth:120 }}>
        <div style={{ display:"flex", gap:4 }}>
          {[["spot","Spot"],["recurring","Recurring"]].map(([t,l])=>(
            <button key={t} onClick={()=>onUpdate(idx,"purchaseType",t)} style={{ flex:1, padding:"4px 0", fontSize:10, fontWeight:700, borderRadius:5, cursor:"pointer", border:`1.5px solid ${row.purchaseType===t?T.teal:T.lgray}`, background:row.purchaseType===t?T.tealLight:T.white, color:row.purchaseType===t?T.teal:T.slate }}>{l}</button>
          ))}
        </div>
        {applyAllType && <div style={{ fontSize:9, color:T.slateLight, marginTop:2, textAlign:"center" }}>set by batch</div>}
      </td>
      <td style={{ padding:"7px 8px", minWidth:90 }}><input style={{ ...S.input, padding:"4px 7px", fontSize:12 }} type="number" min="1" placeholder="N/A" value={row.qty||""} onChange={e=>onUpdate(idx,"qty",e.target.value)} /></td>
      <td style={{ padding:"7px 8px", minWidth:130 }}>
        <CompetitorField
          value={row.competitor||""}
          onChange={v=>onUpdate(idx,"competitor",v)}
          inputStyle={{ ...S.input, padding:"4px 7px", fontSize:11 }}
          compact={true}
        />
      </td>
      <td style={{ padding:"7px 8px", minWidth:90 }}><input style={{ ...S.input, padding:"4px 7px", fontSize:12 }} type="number" step="0.01" placeholder="optional" value={row.targetPrice||""} onChange={e=>onUpdate(idx,"targetPrice",e.target.value)} /></td>
      <td style={{ padding:"7px 8px", minWidth:160 }}>
        <select value={row.quoteReason||""} onChange={e=>onUpdate(idx,"quoteReason",e.target.value)}
          style={{ ...S.input, padding:"4px 7px", fontSize:11, appearance:"none", WebkitAppearance:"none", cursor:"pointer" }}>
          <option value="">-- Select --</option>
          {QUOTE_REASONS.filter(r=>r!=="Other").map(r=><option key={r} value={r}>{r}</option>)}
          <option value="Other">Other</option>
        </select>
        {row.quoteReason==="Other" && (
          <input style={{ ...S.input, padding:"4px 7px", fontSize:11, marginTop:3 }}
            placeholder="Describe reason"
            value={row.quoteReasonOther||""}
            onChange={e=>onUpdate(idx,"quoteReasonOther",e.target.value)} />
        )}
        {applyAllReason && !row.quoteReason && <div style={{ fontSize:9, color:T.slateLight, marginTop:2 }}>set by batch</div>}
      </td>
    </tr>
  );
}

// -- BulkResultRow -------------------------------------------------------------
function BulkResultRow({ r, idx, margin, onMarginChange, isAdmin=false }) {
  const mn=parseFloat(margin)/100, sell=(!r.noCost&&mn>0&&mn<1)?calcSell(r.cost,mn):null, below=mn>0&&mn<FLOOR_MARGIN;
  return (
    <tr style={{ background:r.noCost?"#FFF5F5":idx%2===0?T.white:T.offwhite, borderBottom:`1px solid ${T.lgray}` }}>
      <td style={{ padding:"7px 10px", fontWeight:700, fontSize:12, color:T.navy, whiteSpace:"nowrap" }}>{r.partNum}</td>
      <td style={{ padding:"7px 10px", fontSize:11, color:T.slate, maxWidth:150 }}>{r.desc}</td>
      <td style={{ padding:"7px 10px", fontSize:11, textTransform:"capitalize" }}>{r.purchaseType}</td>
      <td style={{ padding:"7px 10px", fontSize:11, textAlign:"center" }}>{r.qty||"-"}</td>
      {isAdmin && <td style={{ padding:"7px 10px", fontSize:10, color:"#0E7490", maxWidth:200 }}>{r.scenario}</td>}
      <td style={{ padding:"7px 10px", fontWeight:700, textAlign:"right" }}>{r.noCost?<span style={S.tag("red")}>No Cost</span>:<span style={{ fontSize:13, color:T.navy }}>${r.cost.toFixed(4)}</span>}</td>
      <td style={{ padding:"7px 8px", minWidth:70 }}>
        {!r.noCost && <input style={{ ...S.input, padding:"4px 6px", fontSize:11, width:60, textAlign:"center" }} type="number" min="0" max="99" placeholder="%" value={margin} onChange={e=>onMarginChange(r.id, e.target.value)} />}
      </td>
      <td style={{ padding:"7px 10px", textAlign:"right", minWidth:100 }}>
        {sell ? (<div><div style={{ fontSize:12, fontWeight:700, color:below?"#92400E":"#065F46" }}>{fmtSell(sell)}</div>{below&&<div style={{ fontSize:9, color:T.red }}> below 40%</div>}{below&&<div style={{ fontSize:9, color:T.slate }}>Min: {fmtSell(calcSell(r.cost,0.40))}</div>}</div>) : "-"}
      </td>
      <td style={{ padding:"7px 10px", fontSize:11, color:T.slate }}>{r.competitor||"-"}</td>
      <td style={{ padding:"7px 10px", fontSize:11, color:T.slate }}>{r.targetPrice?`$${parseFloat(r.targetPrice).toFixed(2)}`:"-"}</td>
      <td style={{ padding:"7px 10px" }}>{r.noCost&&<span style={{ ...S.tag("red"), fontSize:10, cursor:"pointer" }}> Flag</span>}</td>
    </tr>
  );
}


// -- PricingHistoryTab ---------------------------------------------------------
function PricingHistoryTab({ customerName, customerNum, userId, allLog }) {
  const history = allLog.filter(e =>
    e.userId === userId &&
    (e.customerNum === customerNum || e.customerName?.toLowerCase() === customerName?.toLowerCase())
  ).sort((a,b) => (b.date||0) - (a.date||0));

  if (history.length === 0) {
    return (
      <div style={{ padding:"24px", textAlign:"center", color:T.slateLight, fontSize:13 }}>
        <div style={{ fontSize:22, marginBottom:8 }}></div>
        No previous quotes found for this customer.
      </div>
    );
  }

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
        <thead>
          <tr style={{ background:T.offwhite }}>
            {["Date","Part #","Description","Type","Qty","Cost","Margin","Sell Price","Competitor","Target $","Reason"].map(h=>(
              <th key={h} style={{ padding:"7px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".05em", borderBottom:`2px solid ${T.lgray}`, whiteSpace:"nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((e,idx)=>(
            <tr key={e.id} style={{ background:idx%2===0?T.white:T.offwhite, borderBottom:`1px solid ${T.lgray}` }}>
              <td style={{ padding:"6px 10px", color:T.slateLight, whiteSpace:"nowrap" }}>{e.dateStr||"Today"}</td>
              <td style={{ padding:"6px 10px", fontWeight:700, color:T.navy, whiteSpace:"nowrap" }}>{e.partNum}</td>
              <td style={{ padding:"6px 10px", color:T.slate, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.desc}</td>
              <td style={{ padding:"6px 10px", textTransform:"capitalize" }}>{e.purchaseType}</td>
              <td style={{ padding:"6px 10px", textAlign:"center" }}>{e.qty||"-"}</td>
              <td style={{ padding:"6px 10px", fontWeight:700 }}>{e.noCost?<span style={S.tag("red")}>No Cost</span>:`$${e.cost?.toFixed(4)||"-"}`}</td>
              <td style={{ padding:"6px 10px", textAlign:"center" }}>{e.desiredMarginPct?<span style={S.tag(e.belowFloor?"orange":"green")}>{e.desiredMarginPct}%</span>:"-"}</td>
              <td style={{ padding:"6px 10px", fontWeight:600, color:e.belowFloor?"#92400E":"#065F46" }}>{e.sellPrice?fmtSell(e.sellPrice):"-"}</td>
              <td style={{ padding:"6px 10px", color:T.slate }}>{e.competitor||"-"}</td>
              <td style={{ padding:"6px 10px", color:T.slate }}>{e.targetPrice?`$${parseFloat(e.targetPrice).toFixed(2)}`:"-"}</td>
              <td style={{ padding:"6px 10px", color:T.slate, fontSize:10 }}>{e.quoteReason||"-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -- AdminAuditPanel -----------------------------------------------------------
function AdminAuditPanel({ allLog }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [quick,    setQuick]    = useState("all");
  const [fUser,    setFUser]    = useState("");
  const [fPart,    setFPart]    = useState("");
  const [fMargin,  setFMargin]  = useState("");
  const [fSell,    setFSell]    = useState("");
  const [fComp,    setFComp]    = useState("");
  const [fTarget,  setFTarget]  = useState("");

  // Quick filter -> date range
  function applyQuick(q) {
    setQuick(q);
    const fmt = d => d.toISOString().slice(0,10);
    const now = new Date();
    if (q==="today")  { setDateFrom(fmt(now)); setDateTo(fmt(now)); }
    if (q==="7d")     { const d=new Date(); d.setDate(d.getDate()-6); setDateFrom(fmt(d)); setDateTo(fmt(now)); }
    if (q==="30d")    { const d=new Date(); d.setDate(d.getDate()-29); setDateFrom(fmt(d)); setDateTo(fmt(now)); }
    if (q==="all")    { setDateFrom(""); setDateTo(""); }
  }

  const filtered = useMemo(() => {
    return allLog.filter(e => {
      const eDate = e.date ? new Date(e.date) : null;
      if (dateFrom && eDate) { const f=new Date(dateFrom); f.setHours(0,0,0,0); if (eDate<f) return false; }
      if (dateTo   && eDate) { const t=new Date(dateTo);   t.setHours(23,59,59,999); if (eDate>t) return false; }
      if (fUser   && !e.userName?.toLowerCase().includes(fUser.toLowerCase()))   return false;
      if (fPart   && !e.partNum?.toLowerCase().includes(fPart.toLowerCase()))    return false;
      if (fMargin && !String(e.desiredMarginPct||"").includes(fMargin))          return false;
      if (fSell   && !String(e.sellPrice?e.sellPrice.toFixed(2):"").includes(fSell)) return false;
      if (fComp   && !e.competitor?.toLowerCase().includes(fComp.toLowerCase())) return false;
      if (fTarget && !String(e.targetPrice||"").includes(fTarget))               return false;
      return true;
    });
  }, [allLog, dateFrom, dateTo, fUser, fPart, fMargin, fSell, fComp, fTarget]);

  function exportCSV() {
    if (!filtered.length) return;
    const hdr = ["User","Role","Part #","Description","Purchase Type","Qty","Cost Logic","Cost","Margin %","Sell Price","Below 40%","Competitor","Target Price","Source","Date","Time"];
    const csv = [hdr.join(","), ...filtered.map(e => [
      `"${csvSafe(e.userName||"")}"`, `"${csvSafe(e.role||"")}"`,
      e.partNum, `"${csvSafe(e.desc||"")}"`, e.purchaseType, e.qty||"",
      `"${csvSafe(e.scenario||"")}"`,
      e.noCost?"No Cost":e.cost?.toFixed(4)||"", e.desiredMarginPct||"",
      e.sellPrice?e.sellPrice.toFixed(4):"", e.belowFloor?"YES":"NO",
      e.competitor||"", e.targetPrice||"", e.source||"", e.dateStr||"", e.timestamp||""
    ].join(","))].join("\n");
    const BOM = "\uFEFF";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([BOM + csv], {type:"text/csv;charset=utf-8;"}));
    a.download = `AuditTrail_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  function clearFilters() { setDateFrom(""); setDateTo(""); setQuick("all"); setFUser(""); setFPart(""); setFMargin(""); setFSell(""); setFComp(""); setFTarget(""); }

  const iF = { ...S.input, padding:"6px 9px", fontSize:11 };

  return (
    <div style={S.card}>
      <div style={{ ...S.head, background:`linear-gradient(90deg,${T.purple},#6D28D9)` }}>
        <span>Full Audit Trail - All Users ({filtered.length} of {allLog.length} records)</span>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={clearFilters} style={{ background:"rgba(255,255,255,0.15)", color:T.white, border:"none", borderRadius:5, padding:"4px 12px", fontSize:11, cursor:"pointer" }}>Clear Filters</button>
          <button onClick={exportCSV} style={{ background:"rgba(255,255,255,0.2)", color:T.white, border:"1px solid rgba(255,255,255,0.4)", borderRadius:5, padding:"4px 12px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Export CSV</button>
        </div>
      </div>

      {/* Filter panel */}
      <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.lgray}`, background:"#FAFBFF" }}>
        {/* Quick date filters */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          <span style={{ fontSize:11, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".05em" }}>Date Range</span>
          {[["today","Today"],["7d","Last 7 Days"],["30d","Last 30 Days"],["all","All Time"]].map(([k,l])=>(
            <button key={k} onClick={()=>applyQuick(k)}
              style={{ padding:"4px 12px", fontSize:11, fontWeight:700, borderRadius:5, cursor:"pointer", border:`1.5px solid ${quick===k?T.purple:T.lgray}`, background:quick===k?"#EDE9FE":T.white, color:quick===k?T.purple:T.slate }}>
              {l}
            </button>
          ))}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:8 }}>
            <input style={{ ...iF, width:130 }} type="date" value={dateFrom} onChange={e=>{ setDateFrom(e.target.value); setQuick(""); }} placeholder="From" />
            <span style={{ color:T.slateLight, fontSize:11 }}>{"->"}</span>
            <input style={{ ...iF, width:130 }} type="date" value={dateTo} onChange={e=>{ setDateTo(e.target.value); setQuick(""); }} placeholder="To" />
          </div>
        </div>
        {/* Field filters */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10 }}>
          {[["User",fUser,setFUser,"e.g. James Davis"],["Part #",fPart,setFPart,"e.g. BRN-4820"],["Margin %",fMargin,setFMargin,"e.g. 45"],["Sell Price",fSell,setFSell,"e.g. 1.52"],["Competitor",fComp,setFComp,"e.g. World Wide"],["Target Price",fTarget,setFTarget,"e.g. 5.00"]].map(([label,val,setter,ph])=>(
            <div key={label}>
              <div style={{ fontSize:10, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>{label}</div>
              <input style={iF} value={val} onChange={e=>setter(e.target.value)} placeholder={ph} />
            </div>
          ))}
        </div>
      </div>

      {/* Results table */}
      <div style={{ overflowX:"auto" }}>
        {filtered.length===0 ? (
          <div style={{ padding:"32px", textAlign:"center", color:T.slateLight, fontSize:13 }}>No records match the current filters.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ background:T.offwhite }}>
                {["User","Part #","Description","Type","Qty","Cost Logic","Cost","Margin %","Sell Price","Below Floor","Competitor","Target $","Source","Date"].map(h=>(
                  <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".05em", borderBottom:`2px solid ${T.lgray}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e,idx)=>{
                const user = USERS[e.userId];
                return (
                  <tr key={e.id} style={{ background:idx%2===0?T.white:"#FAFBFC", borderBottom:`1px solid ${T.offwhite}` }}>
                    <td style={{ padding:"7px 10px", whiteSpace:"nowrap" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:24, height:24, borderRadius:"50%", background:e.userId==="mscrima"?T.purple:e.userId==="lwilson"?"#0284C7":T.navyMid, color:T.white, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, flexShrink:0 }}>{user?.initials||"?"}</div>
                        <div><div style={{ fontSize:11, fontWeight:600, color:T.navy }}>{user?.name||e.userId}</div><div style={{ fontSize:9, color:T.slateLight }}>{user?.title}</div></div>
                      </div>
                    </td>
                    <td style={{ padding:"7px 10px", fontWeight:700, color:T.navy, whiteSpace:"nowrap" }}>{e.partNum}</td>
                    <td style={{ padding:"7px 10px", color:T.slate, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.desc}</td>
                    <td style={{ padding:"7px 10px", textTransform:"capitalize" }}>{e.purchaseType}</td>
                    <td style={{ padding:"7px 10px", textAlign:"center" }}>{e.qty||"-"}</td>
                    <td style={{ padding:"7px 10px", color:"#0E7490", fontSize:10, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.scenario}</td>
                    <td style={{ padding:"7px 10px", fontWeight:700 }}>{e.noCost?<span style={S.tag("red")}>No Cost</span>:`$${e.cost?.toFixed(4)||"-"}`}</td>
                    <td style={{ padding:"7px 10px", textAlign:"center" }}>{e.desiredMarginPct?<span style={S.tag(e.belowFloor?"orange":"green")}>{e.desiredMarginPct}%</span>:"-"}</td>
                    <td style={{ padding:"7px 10px", fontWeight:600, color:e.belowFloor?"#92400E":"#065F46" }}>{e.sellPrice?fmtSell(e.sellPrice):"-"}</td>
                    <td style={{ padding:"7px 10px", textAlign:"center" }}>{e.desiredMarginPct?<span style={S.tag(e.belowFloor?"red":"green")}>{e.belowFloor?" Below":" OK"}</span>:"-"}</td>
                    <td style={{ padding:"7px 10px", color:T.slate }}>{e.competitor||"-"}</td>
                    <td style={{ padding:"7px 10px", color:T.slate }}>{e.targetPrice?`$${parseFloat(e.targetPrice).toFixed(2)}`:"-"}</td>
                    <td style={{ padding:"7px 10px" }}><span style={{ ...S.tag(e.source==="bulk"?"orange":"green"), fontSize:10 }}>{e.source}</span></td>
                    <td style={{ padding:"7px 10px", color:T.slateLight, whiteSpace:"nowrap" }}>{e.dateStr}</td>
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

// -- Main Dashboard ------------------------------------------------------------
export default function PartCostDashboard() {
  // -- User / role state --
  const [currentUser, setCurrentUser] = useState(null);  // null = login screen

  // -- Mode & navigation --
  const [mode, setMode]           = useState("single");
  const [dailyUsed, setDailyUsed] = useState(0);

  // -- Single lookup --
  const [step, setStep]               = useState(1);
  const [partNum, setPartNum]         = useState("");
  const [partError, setPartError]     = useState("");
  const [foundPart, setFoundPart]     = useState(null);
  const [purchaseType, setPurchaseType] = useState("");
  const [qty, setQty]                 = useState("");
  const [competitor, setCompetitor]   = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [result, setResult]           = useState(null);
  const [desiredMargin, setDesiredMargin] = useState("");
  // -- Customer fields --
  const [customerNum, setCustomerNum]   = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [historyTab, setHistoryTab]     = useState("lookup"); // "lookup" | "history"
  // -- Quote reason --
  const [quoteReason, setQuoteReason]     = useState("");
  const [quoteReasonOther, setQuoteReasonOther] = useState("");
  const [quoteReasonError, setQuoteReasonError] = useState("");
  // -- Bulk customer --
  const [bulkCustomerNum, setBulkCustomerNum]   = useState("");
  const [bulkCustomerName, setBulkCustomerName] = useState("");
  const [bulkIsNewCustomer, setBulkIsNewCustomer] = useState(false);
  const [bulkCustomerError, setBulkCustomerError] = useState("");

  // -- Bulk --
  const [bulkInput, setBulkInput]         = useState("");
  const [bulkFile, setBulkFile]           = useState(null);
  const [bulkRows, setBulkRows]           = useState([]);
  const [bulkApplyType, setBulkApplyType] = useState(false);
  const [bulkAllType, setBulkAllType]     = useState("spot");
  const [bulkResults, setBulkResults]     = useState(null);
  const [bulkError, setBulkError]         = useState("");
  const [bulkStep, setBulkStep]           = useState(1);
  const [bulkMargins, setBulkMargins]     = useState({});
  const [bulkApplyReason, setBulkApplyReason] = useState(false);
  const [bulkAllReason, setBulkAllReason]     = useState("");
  const [bulkHistoryTab, setBulkHistoryTab]   = useState("input"); // "input" | "history" 
  const fileRef = useRef();

  // -- Session log (current user's own lookups today) --
  const [sessionLog, setSessionLog] = useState([]);
  const [selected, setSelected]     = useState({});
  const [selectAll, setSelectAll]   = useState(false);

  // -- All-users log (seed + session) --
  const allLog = useMemo(() => {
    const sessionWithUser = sessionLog.map(e => ({
      ...e, userId:currentUser, userName:USERS[currentUser]?.name||currentUser,
      date: new Date(), dateStr: new Date().toLocaleDateString()
    }));
    return [...sessionWithUser, ...SEED_LOG];
  }, [sessionLog, currentUser]);

  const remaining   = DAILY_LIMIT - dailyUsed;
  const validBulk   = bulkRows.filter(r=>!r.error).length;
  const anySelected = Object.values(selected).some(v=>v);
  const isAdmin     = currentUser ? USERS[currentUser]?.role==="admin" : false;
  const bulkEligibleIds = bulkResults ? bulkResults.filter(r=>!r.noCost).map(r=>r.id) : [];
  const STEPS = [{n:1,l:"Part Lookup"},{n:2,l:"Purchase Type"},{n:3,l:"Qty & Details"},{n:4,l:"Results"}];

  // -- Handlers --------------------------------------------------------------
  function resetSingle() { setStep(1); setPartNum(""); setFoundPart(null); setPurchaseType(""); setQty(""); setCompetitor(""); setTargetPrice(""); setResult(null); setDesiredMargin(""); setPartError(""); setCustomerNum(""); setCustomerName(""); setIsNewCustomer(false); setCustomerError(""); setHistoryTab("lookup"); setQuoteReason(""); setQuoteReasonOther(""); setQuoteReasonError(""); }
  function resetBulk()   { setBulkInput(""); setBulkFile(null); setBulkRows([]); setBulkResults(null); setBulkError(""); setBulkStep(1); setBulkApplyType(false); setBulkMargins({}); setBulkCustomerNum(""); setBulkCustomerName(""); setBulkIsNewCustomer(false); setBulkCustomerError(""); setBulkApplyReason(false); setBulkAllReason(""); setBulkHistoryTab("input"); if(fileRef.current) fileRef.current.value=""; }

  function handleLookup() {
    if (remaining<=0) { setPartError("Daily limit reached."); return; }
    const key=partNum.trim().toUpperCase(); if (!key) { setPartError("Please enter a part number."); return; }
    const p=PARTS_DB[key]; if (!p) { setPartError(`Part not found. Demo parts: ${Object.keys(PARTS_DB).join(", ")}`); return; }
    setPartError(""); setFoundPart(p); setStep(2);
  }

  function handleCalc() {
    // Validate customer
    if (!isNewCustomer && (!customerNum.trim() || !customerName.trim())) {
      setCustomerError("Please enter both Customer Number and Name, or click New Customer.");
      return;
    }
    // Validate quote reason
    const finalReason = quoteReason === "Other" ? quoteReasonOther.trim() || "Other" : quoteReason;
    if (!quoteReason) { setQuoteReasonError("Please select a reason for this pricing request."); return; }
    setCustomerError(""); setQuoteReasonError("");
    const qtyNum=qty?parseInt(qty,10):null;
    const r=buildScenario(foundPart,purchaseType,qtyNum);
    setResult({...r, partNum:partNum.toUpperCase(), desc:foundPart.desc, purchaseType, qty:qtyNum, inventory:foundPart.inventory, competitor, targetPrice, timestamp:new Date().toLocaleTimeString(),
      customerNum: isNewCustomer ? "NEW" : customerNum.trim(),
      customerName: isNewCustomer ? "New Customer" : customerName.trim(),
      quoteReason: finalReason,
    });
    setDailyUsed(p=>p+1); setStep(5);
  }

  function handleAddToLog() {
    const mn=parseFloat(desiredMargin)/100||null;
    const sell=(mn&&result.cost>0)?calcSell(result.cost,mn):null;
    const e={id:Date.now(),...result, desiredMarginPct:mn?(mn*100).toFixed(1):null, sellPrice:sell, belowFloor:mn?mn<FLOOR_MARGIN:false, source:"single"};
    setSessionLog(prev=>[e,...prev]); setSelected(prev=>({...prev,[e.id]:false})); resetSingle();
  }

  // Pricing history for current rep + customer (single lookup)
  const pricingHistory = useMemo(() => {
    if (!customerNum && !customerName) return [];
    return [...sessionLog, ...SEED_LOG.map(e=>({...e, date:e.date, dateStr:e.dateStr}))].filter(e =>
      e.userId === currentUser &&
      (e.customerNum === customerNum || e.customerName?.toLowerCase() === customerName?.toLowerCase())
    ).sort((a,b)=>(b.date||0)-(a.date||0));
  }, [customerNum, customerName, sessionLog, currentUser]);

  // Pricing history for current rep + bulk customer
  const bulkPricingHistory = useMemo(() => {
    if (!bulkCustomerNum && !bulkCustomerName) return [];
    return [...sessionLog, ...SEED_LOG.map(e=>({...e, date:e.date, dateStr:e.dateStr}))].filter(e =>
      e.userId === currentUser &&
      (e.customerNum === bulkCustomerNum || e.customerName?.toLowerCase() === bulkCustomerName?.toLowerCase())
    ).sort((a,b)=>(b.date||0)-(a.date||0));
  }, [bulkCustomerNum, bulkCustomerName, sessionLog, currentUser]);

  function handleBulkParse() {
    setBulkError(""); let rows=[];
    if (bulkFile) {
      const lines=bulkFile.split("\n").filter(l=>l.trim()); const start=lines[0].toLowerCase().includes("part")?1:0;
      rows=lines.slice(start).map(l=>{ const c=l.split(",").map(s=>s.trim().replace(/^"|"$/g,"")); return {partNum:c[0]?.toUpperCase()||"",qty:c[1]||"",purchaseType:(c[2]||"spot").toLowerCase().includes("rec")?"recurring":"spot",competitor:c[3]||"",targetPrice:c[4]||"",quoteReason:"",quoteReasonOther:"",error:null}; }).filter(r=>r.partNum);
    } else {
      const parts=bulkInput.split(/[\n,]+/).map(s=>s.trim().toUpperCase()).filter(Boolean);
      if (!parts.length) { setBulkError("Please enter at least one part number."); return; }
      rows=parts.map(p=>({partNum:p,qty:"",purchaseType:"spot",competitor:"",targetPrice:"",quoteReason:"",quoteReasonOther:"",error:null}));
    }
    if (rows.length>BULK_LIMIT) { setBulkError(`Bulk import is limited to ${BULK_LIMIT} items. You submitted ${rows.length}.`); return; }
    rows=rows.map(r=>({...r, error:PARTS_DB[r.partNum]?null:"Part not found"}));
    setBulkRows(rows); setBulkStep(2);
  }

  function handleBulkRun() {
    setBulkError("");
    if (!bulkIsNewCustomer && (!bulkCustomerNum.trim() || !bulkCustomerName.trim())) {
      setBulkCustomerError("Please enter both Customer Number and Name, or click New Customer.");
      return;
    }
    setBulkCustomerError("");
    const valid=bulkRows.filter(r=>!r.error);
    if (!valid.length) { setBulkError("No valid parts to process."); return; }
    if (valid.some(r=>!r.purchaseType)) { setBulkError("All items must have a purchase type."); return; }
    if (valid.length>remaining) { setBulkError(`This batch requires ${valid.length} lookups but you only have ${remaining} remaining today.`); return; }
    const bCustNum  = bulkIsNewCustomer ? "NEW" : bulkCustomerNum.trim();
    const bCustName = bulkIsNewCustomer ? "New Customer" : bulkCustomerName.trim();
    const results=valid.map(r=>{ const part=PARTS_DB[r.partNum]; const sc=buildScenario(part,r.purchaseType,r.qty); const finalReason=r.quoteReason==="Other"?(r.quoteReasonOther||"Other"):r.quoteReason; return {...sc, id:Date.now()+Math.random(), partNum:r.partNum, desc:part.desc, purchaseType:r.purchaseType, qty:r.qty||null, inventory:part.inventory, competitor:r.competitor, targetPrice:r.targetPrice, quoteReason:finalReason, timestamp:new Date().toLocaleTimeString(), customerNum:bCustNum, customerName:bCustName}; });
    setDailyUsed(p=>p+valid.length); setBulkResults(results);
    const initM={}; results.forEach(r=>{ if(!r.noCost) initM[r.id]=""; }); setBulkMargins(initM);
    setBulkStep(3);
    const entries=results.map(r=>({...r, desiredMarginPct:null, sellPrice:null, belowFloor:false, source:"bulk"}));
    setSessionLog(prev=>[...entries,...prev]); setSelected(prev=>{ const u={...prev}; entries.forEach(e=>{u[e.id]=false;}); return u; });
  }

  function handleFile(e) { const f=e.target.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=ev=>{setBulkFile(ev.target.result);setBulkInput("");}; reader.readAsText(f); }
  function handleSelectAll(v) { setSelectAll(v); setSelected(Object.fromEntries(sessionLog.map(e=>[e.id,v]))); }
  function handleSelectOne(id,v) { const u={...selected,[id]:v}; setSelected(u); setSelectAll(sessionLog.every(e=>u[e.id])); }
  function handleApplyAll(c) { setBulkApplyType(c); if(c) setBulkRows(prev=>prev.map(r=>({...r,purchaseType:bulkAllType}))); }
  function handleAllTypeChange(t) { setBulkAllType(t); if(bulkApplyType) setBulkRows(prev=>prev.map(r=>({...r,purchaseType:t}))); }

  function handleExport() {
    const pool = isAdmin ? allLog : sessionLog;
    const rows = pool.filter(e => selected[e.id]);
    if (!rows.length) return;
    const hdr = isAdmin
      ? ["Looked Up By","Role","Part #","Description","Purchase Type","Qty","Cost Logic","Cost","Competitor","Target Price","Source","Date","Time"]
      : ["Looked Up By","Part #","Description","Purchase Type","Qty","Cost Logic","Cost","Competitor","Target Price","Source","Time"];
    const rowData = rows.map(e => {
      const u = USERS[e.userId||currentUser];
      const name = u ? u.name : (e.userName || currentUser);
      const role = u ? (u.role==="admin"?"Admin / Leadership":"Sales Rep") : "";
      if (isAdmin) {
        return [
          `"${csvSafe(name)}"`, `"${csvSafe(role)}"`,
          e.partNum, `"${csvSafe(e.desc||"")}"`, e.purchaseType, e.qty||"",
          `"${csvSafe(e.scenario||"")}"`, e.noCost?"No Cost":(e.cost?.toFixed(4)||""),
          e.competitor||"", e.targetPrice||"", e.source||"",
          e.dateStr||new Date().toLocaleDateString(), e.timestamp||""
        ].join(",");
      } else {
        return [
          `"${csvSafe(name)}"`,
          e.partNum, `"${csvSafe(e.desc||"")}"`, e.purchaseType, e.qty||"",
          `"${csvSafe(e.scenario||"")}"`, e.noCost?"No Cost":(e.cost?.toFixed(4)||""),
          e.competitor||"", e.targetPrice||"", e.source||"", e.timestamp||""
        ].join(",");
      }
    });
    const BOM = "\uFEFF";
    const csv = [hdr.join(","), ...rowData].join("\n");
    const prefix = isAdmin ? "FullAuditExport" : "MyLookups";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([BOM + csv], {type:"text/csv;charset=utf-8;"}));
    a.download = `${prefix}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const marginNum  = parseFloat(desiredMargin)/100;
  const sellPrice  = (result&&result.cost>0&&marginNum>0&&marginNum<1)?calcSell(result.cost,marginNum):null;
  const belowFloor = marginNum>0&&marginNum<FLOOR_MARGIN;

  // -- LOGIN SCREEN ----------------------------------------------------------
  if (!currentUser) {
    return (
      <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${T.navy} 0%,#1E3A5F 100%)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ background:T.white, borderRadius:16, padding:"40px 48px", width:440, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:20, fontWeight:700, color:T.navy, letterSpacing:".04em" }}>BRENNAN INDUSTRIES</div>
            <div style={{ fontSize:12, color:T.teal, letterSpacing:".12em", textTransform:"uppercase", marginTop:4 }}>Part Cost Lookup Tool</div>
            <div style={{ width:40, height:3, background:T.teal, borderRadius:2, margin:"14px auto 0" }} />
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".06em", marginBottom:12 }}>Select Your Account</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {Object.entries(USERS).map(([id,u])=>(
              <button key={id} onClick={()=>setCurrentUser(id)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", border:`1.5px solid ${T.lgray}`, borderRadius:10, background:T.offwhite, cursor:"pointer", transition:"all .15s", textAlign:"left" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.teal;e.currentTarget.style.background=T.tealLight;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.lgray;e.currentTarget.style.background=T.offwhite;}}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:u.role==="admin"?T.purple:T.navyMid, color:T.white, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{u.initials}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.navy }}>{u.name}</div>
                  <div style={{ fontSize:11, color:T.slate, marginTop:1 }}>{u.title}  <span style={{ color:u.role==="admin"?T.purple:T.teal, fontWeight:600 }}>{u.role==="admin"?"Admin / Leadership":"Sales Rep"}</span></div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ marginTop:20, fontSize:11, color:T.slateLight, textAlign:"center" }}>This is a demo - select any account to continue</div>
        </div>
      </div>
    );
  }

  const user = USERS[currentUser];

  // -- MAIN APP --------------------------------------------------------------
  return (
    <div style={{ minHeight:"100vh", background:T.offwhite, fontFamily:"'Segoe UI',system-ui,sans-serif", fontSize:13, color:T.navy }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${T.navy},${T.navyMid})`, padding:"12px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 12px rgba(0,0,0,0.2)" }}>
        <div>
          <div style={{ color:T.white, fontSize:17, fontWeight:700, letterSpacing:".04em" }}>BRENNAN INDUSTRIES</div>
          <div style={{ color:"#4A9EFF", fontSize:10, letterSpacing:".14em", textTransform:"uppercase", marginTop:1 }}>Part Cost Lookup Tool</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <DailyBadge used={dailyUsed} />
          {/* Logged-in user chip */}
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 12px" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:isAdmin?T.purple:T.tealLight, color:isAdmin?T.white:T.teal, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700 }}>{user.initials}</div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:T.white }}>{user.name}</div>
              <div style={{ fontSize:10, color:isAdmin?"#C4B5FD":"#5EEAD4" }}>{isAdmin?"Admin / Leadership":"Sales Rep"}</div>
            </div>
            <button onClick={()=>setCurrentUser(null)} style={{ marginLeft:6, background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.6)", border:"none", borderRadius:4, padding:"2px 8px", fontSize:10, cursor:"pointer" }}>Switch</button>
          </div>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:11, textAlign:"right" }}>
            <div>US Sales - Internal Use Only</div>
            <div style={{ color:"#4A9EFF", marginTop:2 }}>{new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"22px 16px 40px" }}>

        {/* Mode toggle */}
        <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
          {[["single","Single Lookup"],["bulk",`Bulk Import (up to ${BULK_LIMIT})`]].map(([m,label])=>(
            <button key={m} onClick={()=>{ setMode(m); if(m==="single") resetSingle(); else resetBulk(); }}
              style={{ padding:"9px 20px", borderRadius:7, fontSize:13, fontWeight:700, cursor:"pointer", border:`2px solid ${mode===m?T.teal:T.lgray}`, background:mode===m?T.teal:T.white, color:mode===m?T.white:T.slate, transition:"all .2s" }}>
              {mode===m?(m==="single"?"* ":" "):(m==="single"?"* ":" ")}{label}
            </button>
          ))}
          {isAdmin && (
            <button onClick={()=>setMode("audit")} style={{ padding:"9px 20px", borderRadius:7, fontSize:13, fontWeight:700, cursor:"pointer", border:`2px solid ${mode==="audit"?T.purple:T.lgray}`, background:mode==="audit"?T.purple:T.white, color:mode==="audit"?T.white:T.slate, transition:"all .2s" }}>
              {mode==="audit"?"* ":"* "}Audit Trail
            </button>
          )}
          <div style={{ marginLeft:"auto", fontSize:12, color:remaining<=10?T.red:T.slate, fontWeight:remaining<=10?700:400 }}>
            {remaining>0?`${remaining} lookup${remaining===1?"":"s"} remaining today`:" Daily limit reached"}
          </div>
        </div>

        {/* --- ADMIN AUDIT MODE ---------------------------------------------- */}
        {mode==="audit" && isAdmin && <AdminAuditPanel allLog={allLog} />}

        {/* --- SINGLE MODE --------------------------------------------------- */}
        {mode==="single" && (<>
          <div style={{ display:"flex", alignItems:"center", background:T.white, borderRadius:10, padding:"13px 18px", marginBottom:18, boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
            {STEPS.map((st,i)=>(
              <div key={st.n} style={{ display:"flex", alignItems:"center", flex:i<STEPS.length-1?1:0 }}>
                <StepDot n={st.n} active={step===st.n||(st.n===4&&step===5)} done={step>st.n&&!(st.n===4&&step===5)} label={st.l} />
                {i<STEPS.length-1 && <div style={{ flex:1, height:2, margin:"0 5px", background:step>st.n?T.teal:T.lgray, transition:"background .3s" }} />}
              </div>
            ))}
          </div>

          {step===1 && (
            <div style={S.card}>
              <div style={S.head}>Step 1 - Customer & Part Lookup</div>
              <div style={{ padding:20 }}>
                {remaining<=0&&<div style={{ background:T.redLight, border:`1px solid #FCA5A5`, borderRadius:7, padding:"10px 14px", marginBottom:14, color:"#991B1B", fontWeight:600 }}>Daily limit reached. Please try again tomorrow.</div>}
                {remaining>0&&remaining<=10&&<div style={{ background:T.orangeLight, border:`1px solid #FCD34D`, borderRadius:7, padding:"10px 14px", marginBottom:14, color:"#92400E" }}> You have <strong>{remaining}</strong> lookup{remaining===1?"":"s"} remaining today.</div>}

                {/* Customer section */}
                <div style={{ background:T.offwhite, borderRadius:8, padding:"14px 16px", marginBottom:18 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".06em" }}>Customer Information</div>
                    <button
                      onClick={()=>{ setIsNewCustomer(!isNewCustomer); setCustomerNum(""); setCustomerName(""); setCustomerError(""); }}
                      style={{ padding:"4px 12px", fontSize:11, fontWeight:700, borderRadius:5, cursor:"pointer", border:`1.5px solid ${isNewCustomer?T.orange:T.lgray}`, background:isNewCustomer?T.orangeLight:T.white, color:isNewCustomer?"#92400E":T.slate }}>
                      {isNewCustomer ? " New Customer" : "+ New Customer"}
                    </button>
                  </div>
                  {!isNewCustomer ? (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12 }}>
                      <div>
                        <label style={S.lbl}>Customer Number <span style={{ color:T.red }}>*</span></label>
                        <CustomerNumberInput
                          value={customerNum}
                          onChangeNum={v=>{ setCustomerNum(v); setCustomerError(""); }}
                          onChangeName={v=>setCustomerName(v)}
                          nameValue={customerName}
                          errorBorder={!!customerError}
                          placeholder="Type to search (e.g. C-100)"
                        />
                      </div>
                      <div>
                        <label style={S.lbl}>Customer Name <span style={{ color:T.red }}>*</span></label>
                        <input style={{ ...S.input, borderColor:customerError?T.red:T.lgray, background:customerName&&CUSTOMER_DB[customerNum]?T.tealLight:T.white }} value={customerName}
                          onChange={e=>{ setCustomerName(e.target.value); setCustomerError(""); }}
                          placeholder="Auto-filled from customer number" />
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding:"8px 12px", background:T.orangeLight, borderRadius:6, fontSize:12, color:"#92400E", fontWeight:600 }}>
                      New Customer - customer fields bypassed. Pricing history will not be available.
                    </div>
                  )}
                  {customerError && <div style={{ color:T.red, fontSize:12, marginTop:8 }}>{customerError}</div>}

                  {/* Pricing history tab - only show when customer is entered */}
                  {!isNewCustomer && (customerNum || customerName) && (
                    <div style={{ marginTop:14 }}>
                      <div style={{ display:"flex", gap:0, borderBottom:`2px solid ${T.lgray}`, marginBottom:0 }}>
                        {[["lookup"," Part Lookup"],["history",` Pricing History${pricingHistory.length>0?" ("+pricingHistory.length+")":""}`]].map(([tab,label])=>(
                          <button key={tab} onClick={()=>setHistoryTab(tab)}
                            style={{ padding:"7px 16px", fontSize:11, fontWeight:700, cursor:"pointer", border:"none", borderBottom:`2px solid ${historyTab===tab?T.teal:"transparent"}`, background:"transparent", color:historyTab===tab?T.teal:T.slate, marginBottom:-2 }}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {historyTab==="history" && (
                        <div style={{ marginTop:0, border:`1px solid ${T.lgray}`, borderTop:"none", borderRadius:"0 0 8px 8px", overflow:"hidden" }}>
                          <PricingHistoryTab customerName={customerName} customerNum={customerNum} userId={currentUser} allLog={[...sessionLog.map(e=>({...e,userId:currentUser,date:new Date(),dateStr:new Date().toLocaleDateString()})),...SEED_LOG]} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Part number lookup */}
                {historyTab === "lookup" && (
                  <>
                    <label style={S.lbl}>Part Number</label>
                    <div style={{ display:"flex", gap:10 }}>
                      <input style={S.input} value={partNum} onChange={e=>{setPartNum(e.target.value);setPartError("");}} onKeyDown={e=>e.key==="Enter"&&handleLookup()} placeholder="e.g. BRN-4820-SS" disabled={remaining<=0} />
                      <button style={{ ...S.btn, opacity:remaining<=0?.5:1 }} onClick={handleLookup} disabled={remaining<=0}>Look Up</button>
                    </div>
                    {partError&&<div style={{ color:T.red, fontSize:12, marginTop:6 }}>{partError}</div>}
                    <div style={{ marginTop:8, fontSize:11, color:T.slateLight }}>Demo parts: {Object.keys(PARTS_DB).join("  ")}</div>
                    <div style={{ marginTop:14 }}><button style={{ ...S.btnO, fontSize:11 }} onClick={()=>{setPartNum("");setPartError("");}}>Clear</button></div>
                  </>
                )}
              </div>
            </div>
          )}

          {step===2&&foundPart&&(
            <div style={S.card}>
              <div style={S.head}>Step 2 - Purchase Type</div>
              <div style={{ padding:20 }}>
                <div style={{ background:T.offwhite, borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
                  <div style={{ fontSize:11, color:T.slate }}>Part Found</div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.navy, marginTop:2 }}>{partNum.toUpperCase()}</div>
                  <div style={{ fontSize:12, color:"#475569" }}>{foundPart.desc}</div>
                </div>
                <label style={S.lbl}>Spot Buy or Recurring Purchase?</label>
                <div style={{ display:"flex", gap:12, marginTop:8 }}>
                  {[["spot","","Spot Buy"],["recurring","","Recurring"]].map(([t,icon,label])=>(
                    <button key={t} onClick={()=>{setPurchaseType(t);setStep(4);}}
                      style={{ flex:1, padding:"14px 8px", border:`2px solid ${purchaseType===t?T.teal:T.lgray}`, borderRadius:8, background:purchaseType===t?T.tealLight:T.offwhite, color:purchaseType===t?T.teal:T.slate, cursor:"pointer", fontSize:13, fontWeight:700 }}>
                      <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>{label}
                    </button>
                  ))}
                </div>
                <button style={{ ...S.btnO, marginTop:14, fontSize:11 }} onClick={()=>{setStep(1);setFoundPart(null);}}> Back</button>
              </div>
            </div>
          )}



          {step===4&&(
            <div style={S.card}>
              <div style={S.head}>Step 3 - Quantity & Quote Details</div>
              <div style={{ padding:20 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:16 }}>
                  <div>
                    <label style={S.lbl}>Quantity Requested <span style={{ color:T.slateLight, fontWeight:400, textTransform:"none" }}>(optional)</span></label>
                    <input style={S.input} type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} placeholder="Leave blank if unknown" />
                  </div>
                  <div>
                    <label style={S.lbl}>Competitor <span style={{ color:T.slateLight, fontWeight:400, textTransform:"none" }}>(optional)</span></label>
                    <CompetitorField value={competitor} onChange={setCompetitor} inputStyle={S.input} />
                  </div>
                  <div>
                    <label style={S.lbl}>Customer Target Price <span style={{ color:T.slateLight, fontWeight:400, textTransform:"none" }}>(optional)</span></label>
                    <input style={S.input} type="number" step="0.01" value={targetPrice} onChange={e=>setTargetPrice(e.target.value)} placeholder="e.g. 1.50" />
                  </div>
                </div>

                {/* Quote Reason - required */}
                <div style={{ background:T.offwhite, borderRadius:8, padding:"14px 16px", marginBottom:16 }}>
                  <label style={S.lbl}>Reason for Pricing Request <span style={{ color:T.red }}>*</span></label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom: quoteReason==="Other"?10:0 }}>
                    {QUOTE_REASONS.map(r=>(
                      <button key={r} onClick={()=>{ setQuoteReason(r); setQuoteReasonError(""); setQuoteReasonOther(""); }}
                        style={{ padding:"6px 14px", fontSize:12, fontWeight:700, borderRadius:6, cursor:"pointer", border:`1.5px solid ${quoteReason===r?T.teal:T.lgray}`, background:quoteReason===r?T.tealLight:T.white, color:quoteReason===r?T.teal:T.slate, transition:"all .15s" }}>
                        {r}
                      </button>
                    ))}
                  </div>
                  {quoteReason==="Other" && (
                    <input style={{ ...S.input, marginTop:8 }} value={quoteReasonOther} onChange={e=>setQuoteReasonOther(e.target.value)} placeholder="Please describe the reason (optional)" />
                  )}
                  {quoteReasonError && <div style={{ color:T.red, fontSize:12, marginTop:8 }}>{quoteReasonError}</div>}
                </div>

                <div style={{ display:"flex", gap:10, marginTop:18 }}>
                  <button style={S.btnO} onClick={()=>setStep(2)}> Back</button>
                  <button style={S.btn} onClick={handleCalc}>{"Calculate Cost ->"}</button>
                </div>
              </div>
            </div>
          )}

          {step===5&&result&&(<>
            {result.noCost&&(
              <div style={{ background:T.redLight, border:`1px solid #FCA5A5`, borderRadius:8, padding:"12px 16px", marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#991B1B" }}> There is no available cost for this part.</div>
                <div style={{ fontSize:12, color:"#7F1D1D", marginTop:3 }}>This item should be flagged - please contact the pricing team.</div>
              </div>
            )}
            <div style={S.card}>
              <div style={S.head}>Results - {result.partNum}</div>
              <div style={{ padding:20 }}>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:12, background:T.offwhite, borderRadius:8, padding:"12px 14px", marginBottom:10 }}>
                  {[["Description",result.desc],["Purchase Type",<span style={{textTransform:"capitalize"}}>{result.purchaseType}</span>],["Qty Requested",result.qty||"Not specified"],["Total Inventory",`${result.total?.toLocaleString()} units`]].map(([k,v])=>(
                    <div key={k}><div style={{ fontSize:10, color:T.slateLight, textTransform:"uppercase", letterSpacing:".08em" }}>{k}</div><div style={{ fontSize:13, fontWeight:600, color:T.navy, marginTop:2 }}>{v}</div></div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, background:T.offwhite, borderRadius:8, padding:"12px 14px", marginBottom:16 }}>
                  {[["Customer",result.customerName||"-"],["Customer #",result.customerNum||"-"],["Quote Reason",result.quoteReason||"-"]].map(([k,v])=>(
                    <div key={k}><div style={{ fontSize:10, color:T.slateLight, textTransform:"uppercase", letterSpacing:".08em" }}>{k}</div><div style={{ fontSize:13, fontWeight:600, color:T.navy, marginTop:2 }}>{v}</div></div>
                  ))}
                </div>
                {isAdmin && (
                  <div style={{ background:T.tealLight, border:`1px solid #A5F3FC`, borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
                    <div style={{ fontSize:10, color:"#0E7490", textTransform:"uppercase", letterSpacing:".08em", marginBottom:3 }}>Cost Logic Path</div>
                    <div style={{ fontSize:12, color:"#164E63", fontWeight:600 }}>{result.scenario}</div>
                  </div>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:18, flexWrap:"wrap" }}>
                  <div style={{ background:result.noCost?"#FEE2E2":T.navy, borderRadius:10, padding:"13px 24px", textAlign:"center", minWidth:120 }}>
                    <div style={{ fontSize:10, color:result.noCost?"#FCA5A5":T.slateLight, textTransform:"uppercase", letterSpacing:".1em", marginBottom:3 }}>Cost</div>
                    <div style={{ fontSize:24, fontWeight:700, color:result.noCost?"#991B1B":T.white }}>{result.noCost?"N/A":`$${result.cost.toFixed(4)}`}</div>
                  </div>
                  {result.targetPrice&&<div style={{ background:T.offwhite, border:`1px solid ${T.lgray}`, borderRadius:10, padding:"13px 24px", textAlign:"center" }}><div style={{ fontSize:10, color:T.slateLight, textTransform:"uppercase", letterSpacing:".1em", marginBottom:3 }}>Target Price</div><div style={{ fontSize:20, fontWeight:700, color:T.navy }}>${parseFloat(result.targetPrice).toFixed(4)}</div></div>}
                  {result.competitor&&<div style={{ background:T.offwhite, border:`1px solid ${T.lgray}`, borderRadius:10, padding:"13px 24px", textAlign:"center" }}><div style={{ fontSize:10, color:T.slateLight, textTransform:"uppercase", letterSpacing:".1em", marginBottom:3 }}>Competitor</div><div style={{ fontSize:16, fontWeight:700, color:T.navy }}>{result.competitor}</div></div>}
                </div>
                {!result.noCost&&(
                  <div style={{ background:T.offwhite, border:`1px solid ${T.lgray}`, borderRadius:8, padding:"14px 16px", marginBottom:16 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".05em", marginBottom:12 }}>Margin Calculator</div>

                    {/* Target price margin display */}
                    {result.targetPrice && parseFloat(result.targetPrice) > 0 && result.cost > 0 && (()=>{
                      const tp = parseFloat(result.targetPrice);
                      const tpMargin = (tp - result.cost) / tp;
                      const tpBelow  = tpMargin < FLOOR_MARGIN;
                      return (
                        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, padding:"10px 14px", background:tpBelow?T.redLight:T.greenLight, border:`1px solid ${tpBelow?"#FCA5A5":"#6EE7B7"}`, borderRadius:8 }}>
                          <div>
                            <div style={{ fontSize:10, color:tpBelow?"#991B1B":"#065F46", textTransform:"uppercase", letterSpacing:".08em", fontWeight:700 }}>Customer Target Price Margin</div>
                            <div style={{ fontSize:18, fontWeight:700, color:tpBelow?"#991B1B":"#065F46", marginTop:2 }}>{(tpMargin*100).toFixed(1)}%</div>
                          </div>
                          <div style={{ borderLeft:`1px solid ${tpBelow?"#FCA5A5":"#6EE7B7"}`, paddingLeft:12 }}>
                            {tpBelow
                              ? <div><div style={{ fontSize:11, color:"#991B1B", fontWeight:700 }}> Below 40% Floor</div><div style={{ fontSize:10, color:"#7F1D1D", marginTop:2 }}>Min sell at 40%: {fmtSell(calcSell(result.cost, 0.40))}</div></div>
                              : <div style={{ fontSize:11, color:"#065F46", fontWeight:700 }}> Meets minimum margin</div>
                            }
                          </div>
                        </div>
                      );
                    })()}

                    {/* Quick margin buttons + manual input */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                      <label style={{ fontSize:12, color:"#475569", fontWeight:600 }}>Desired Margin %</label>
                      {[45,50,55].map(pct=>(
                        <button key={pct} onClick={()=>setDesiredMargin(String(pct))}
                          style={{ padding:"5px 14px", fontSize:12, fontWeight:700, borderRadius:6, cursor:"pointer", border:`1.5px solid ${desiredMargin===String(pct)?T.teal:T.lgray}`, background:desiredMargin===String(pct)?T.teal:T.white, color:desiredMargin===String(pct)?T.white:T.slate, transition:"all .15s" }}>
                          {pct}%
                        </button>
                      ))}
                      <input style={{ ...S.input, width:80, textAlign:"center" }} type="number" min="0" max="99" value={desiredMargin} onChange={e=>setDesiredMargin(e.target.value)} placeholder="or type %" />
                    </div>
                    {sellPrice&&(
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:12 }}>
                        <div style={{ background:belowFloor?T.orangeLight:T.greenLight, border:`1.5px solid ${belowFloor?"#FCD34D":"#6EE7B7"}`, borderRadius:8, padding:"8px 18px", textAlign:"center" }}>
                          <div style={{ fontSize:10, color:belowFloor?"#92400E":"#065F46", textTransform:"uppercase", letterSpacing:".08em" }}>Sell Price</div>
                          <div style={{ fontSize:20, fontWeight:700, color:belowFloor?"#92400E":"#065F46" }}>{fmtSell(sellPrice)}</div>
                        </div>
                        {belowFloor?<div style={{ background:T.redLight, border:`1px solid #FCA5A5`, borderRadius:8, padding:"8px 12px" }}><div style={{ fontSize:11, color:"#991B1B", fontWeight:700 }}> Below 40% Floor</div><div style={{ fontSize:10, color:"#7F1D1D", marginTop:2 }}>Min at 40%: {fmtSell(calcSell(result.cost,0.40))}</div></div>:<span style={S.tag("green")}> Meets floor margin</span>}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>Inventory by Location</div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead><tr>{LOCATIONS.map(l=><th key={l} style={{ background:T.offwhite, padding:"6px 10px", textAlign:"center", color:T.navyMid, fontWeight:700, fontSize:11, textTransform:"uppercase", borderBottom:`1px solid ${T.lgray}` }}>{l}</th>)}<th style={{ background:T.lgray, padding:"6px 10px", textAlign:"center", fontWeight:700, fontSize:11, borderBottom:`1px solid ${T.lgray}` }}>Total</th></tr></thead>
                      <tbody><tr>{LOCATIONS.map(l=><td key={l} style={{ padding:"6px 10px", textAlign:"center", color:result.inventory[l]===0?T.slateLight:T.navy, fontWeight:result.inventory[l]>0?600:400 }}>{result.inventory[l].toLocaleString()}</td>)}<td style={{ padding:"6px 10px", textAlign:"center", fontWeight:700, color:T.navy, background:T.offwhite }}>{result.total?.toLocaleString()}</td></tr></tbody>
                    </table>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button style={S.btnO} onClick={()=>setStep(4)}> Back</button>
                  <button style={S.btn} onClick={handleAddToLog}>Save to Log & New Lookup</button>
                </div>
              </div>
            </div>
          </>)}
        </>)}

        {/* --- BULK MODE ----------------------------------------------------- */}
        {mode==="bulk"&&(<>
          {bulkStep===1&&(
            <div style={S.card}>
              <div style={S.head}>Bulk Import - Add Up to {BULK_LIMIT} Items at Once</div>
              <div style={{ padding:20 }}>
                {remaining<=0&&<div style={{ background:T.redLight, border:`1px solid #FCA5A5`, borderRadius:7, padding:"10px 14px", marginBottom:14, color:"#991B1B", fontWeight:600 }}>Daily limit reached.</div>}

                {/* Bulk customer section */}
                <div style={{ background:T.offwhite, borderRadius:8, padding:"14px 16px", marginBottom:18 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".06em" }}>Customer Information (applies to entire batch)</div>
                    <button onClick={()=>{ setBulkIsNewCustomer(!bulkIsNewCustomer); setBulkCustomerNum(""); setBulkCustomerName(""); setBulkCustomerError(""); }}
                      style={{ padding:"4px 12px", fontSize:11, fontWeight:700, borderRadius:5, cursor:"pointer", border:`1.5px solid ${bulkIsNewCustomer?T.orange:T.lgray}`, background:bulkIsNewCustomer?T.orangeLight:T.white, color:bulkIsNewCustomer?"#92400E":T.slate }}>
                      {bulkIsNewCustomer ? " New Customer" : "+ New Customer"}
                    </button>
                  </div>
                  {!bulkIsNewCustomer ? (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12 }}>
                      <div>
                        <label style={S.lbl}>Customer Number <span style={{ color:T.red }}>*</span></label>
                        <CustomerNumberInput
                          value={bulkCustomerNum}
                          onChangeNum={v=>{ setBulkCustomerNum(v); setBulkCustomerError(""); }}
                          onChangeName={v=>setBulkCustomerName(v)}
                          nameValue={bulkCustomerName}
                          errorBorder={!!bulkCustomerError}
                          placeholder="Type to search (e.g. C-100)"
                        />
                      </div>
                      <div>
                        <label style={S.lbl}>Customer Name <span style={{ color:T.red }}>*</span></label>
                        <input style={{ ...S.input, borderColor:bulkCustomerError?T.red:T.lgray, background:bulkCustomerName&&CUSTOMER_DB[bulkCustomerNum]?T.tealLight:T.white }} value={bulkCustomerName}
                          onChange={e=>{ setBulkCustomerName(e.target.value); setBulkCustomerError(""); }}
                          placeholder="Auto-filled from customer number" />
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding:"8px 12px", background:T.orangeLight, borderRadius:6, fontSize:12, color:"#92400E", fontWeight:600 }}>
                      New Customer - customer fields bypassed for this batch.
                    </div>
                  )}
                  {bulkCustomerError && <div style={{ color:T.red, fontSize:12, marginTop:8 }}>{bulkCustomerError}</div>}

                  {/* Pricing history tab -- only show when customer is entered */}
                  {!bulkIsNewCustomer && (bulkCustomerNum || bulkCustomerName) && (
                    <div style={{ marginTop:14 }}>
                      <div style={{ display:"flex", gap:0, borderBottom:`2px solid ${T.lgray}`, marginBottom:0 }}>
                        {[["input","Import Items"],["history",`Pricing History${bulkPricingHistory.length>0?" ("+bulkPricingHistory.length+")":""}`]].map(([tab,label])=>(
                          <button key={tab} onClick={()=>setBulkHistoryTab(tab)}
                            style={{ padding:"7px 16px", fontSize:11, fontWeight:700, cursor:"pointer", border:"none", borderBottom:`2px solid ${bulkHistoryTab===tab?T.teal:"transparent"}`, background:"transparent", color:bulkHistoryTab===tab?T.teal:T.slate, marginBottom:-2 }}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {bulkHistoryTab==="history" && (
                        <div style={{ marginTop:0, border:`1px solid ${T.lgray}`, borderTop:"none", borderRadius:"0 0 8px 8px", overflow:"hidden" }}>
                          <PricingHistoryTab
                            customerName={bulkCustomerName}
                            customerNum={bulkCustomerNum}
                            userId={currentUser}
                            allLog={[...sessionLog.map(e=>({...e,userId:currentUser,date:new Date(),dateStr:new Date().toLocaleDateString()})),...SEED_LOG]}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Only show import inputs when not on history tab */}
                {(!(!bulkIsNewCustomer && (bulkCustomerNum || bulkCustomerName) && bulkHistoryTab==="history")) && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                  <div>
                    <label style={S.lbl}>Option A - Paste Part Numbers</label>
                    <div style={{ fontSize:11, color:T.slate, marginBottom:7 }}>One per line or comma-separated. Max {BULK_LIMIT} items.</div>
                    <textarea style={{ ...S.input, height:145, resize:"vertical", fontFamily:"monospace", fontSize:12 }} placeholder={"BRN-4820-SS\nBRN-7731-CF\nBRN-1155-AL"} value={bulkInput} onChange={e=>{ setBulkInput(e.target.value); setBulkFile(null); if(fileRef.current) fileRef.current.value=""; }} />
                  </div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                      <label style={{ ...S.lbl, marginBottom:0 }}>Option B - Upload CSV File</label>
                      <button
                        onClick={()=>{
                          const headers = ["PartNumber","QuantityRequested","PurchaseType (SpotBuy or Recurring)","Competitor","TargetPrice"];
                          const example = ["BRN-4820-SS","500","SpotBuy","World Wide","1.10"];
                          const csv = [headers.join(","), example.join(",")].join("\n");
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
                          a.download = "BulkLookup_Template.csv";
                          a.click();
                        }}
                        style={{ display:"flex", alignItems:"center", gap:6, background:T.greenLight, color:"#065F46", border:"1.5px solid #6EE7B7", borderRadius:6, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer" }}
                      >
                         Download Template
                      </button>
                    </div>
                    <div style={{ fontSize:11, color:T.slate, marginBottom:7 }}>Fill in the template and upload it here. Only Part Number is required - all other columns are optional.</div>
                    <div style={{ border:`2px dashed ${bulkFile?T.teal:T.lgray}`, borderRadius:8, padding:"28px 16px", textAlign:"center", background:bulkFile?T.tealLight:T.offwhite, cursor:"pointer", transition:"all .2s" }} onClick={()=>fileRef.current?.click()}>
                      <div style={{ fontSize:28, marginBottom:6 }}></div>
                      <div style={{ fontSize:12, color:bulkFile?T.teal:T.slate, fontWeight:bulkFile?700:400 }}>{bulkFile?" File loaded - click to replace":"Click or drag a .CSV file here"}</div>
                      <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display:"none" }} onChange={handleFile} />
                    </div>
                    <div style={{ marginTop:8, background:T.offwhite, borderRadius:6, padding:"8px 12px", fontSize:11, color:T.slate }}>
                      <strong>Columns:</strong> PartNumber  QuantityRequested  PurchaseType (SpotBuy or Recurring)  Competitor  TargetPrice
                    </div>
                  </div>
                </div>
                )}
                {bulkError&&<div style={{ background:T.redLight, border:`1px solid #FCA5A5`, borderRadius:7, padding:"10px 14px", marginTop:14, color:"#991B1B" }}>{bulkError}</div>}
                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button style={S.btnO} onClick={()=>{ setBulkInput(""); setBulkFile(null); setBulkError(""); if(fileRef.current) fileRef.current.value=""; }}>Clear</button>
                  <button style={{ ...S.btn, opacity:remaining<=0?.5:1 }} onClick={handleBulkParse} disabled={remaining<=0}>{"Parse Items ->"}</button>
                </div>
              </div>
            </div>
          )}

          {bulkStep===2&&bulkRows.length>0&&(
            <div style={S.card}>
              <div style={S.head}>
                <span>Review & Configure - {bulkRows.length} item{bulkRows.length===1?"":"s"}</span>
                <button style={{ background:"rgba(255,255,255,0.15)", color:T.white, border:"none", borderRadius:5, padding:"4px 12px", fontSize:11, cursor:"pointer" }} onClick={resetBulk}> Start Over</button>
              </div>
              <div style={{ padding:"14px 18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, background:T.offwhite, borderRadius:8, padding:"10px 14px", marginBottom:10, flexWrap:"wrap" }}>
                  <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:13, fontWeight:600, color:T.navy }}>
                    <input type="checkbox" checked={bulkApplyType} onChange={e=>handleApplyAll(e.target.checked)} style={{ width:15, height:15, cursor:"pointer" }} />
                    Apply one purchase type to all items:
                  </label>
                  {[["spot","Spot Buy"],["recurring","Recurring"]].map(([t,l])=>(
                    <button key={t} onClick={()=>handleAllTypeChange(t)} style={{ padding:"5px 14px", fontSize:12, fontWeight:700, borderRadius:5, cursor:"pointer", border:`1.5px solid ${bulkAllType===t?T.teal:T.lgray}`, background:bulkAllType===t?T.teal:T.white, color:bulkAllType===t?T.white:T.slate }}>{l}</button>
                  ))}
                  <div style={{ marginLeft:"auto", fontSize:12, color:T.slate }}>{validBulk} valid  {bulkRows.filter(r=>r.error).length} with errors</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:14, background:T.offwhite, borderRadius:8, padding:"10px 14px", marginBottom:14, flexWrap:"wrap" }}>
                  <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:13, fontWeight:600, color:T.navy }}>
                    <input type="checkbox" checked={bulkApplyReason} onChange={e=>{
                      setBulkApplyReason(e.target.checked);
                      if (e.target.checked && bulkAllReason) setBulkRows(prev=>prev.map(r=>({...r,quoteReason:bulkAllReason,quoteReasonOther:""})));
                    }} style={{ width:15, height:15, cursor:"pointer" }} />
                    Apply one quote reason to all items:
                  </label>
                  <select value={bulkAllReason} onChange={e=>{
                    setBulkAllReason(e.target.value);
                    if (bulkApplyReason) setBulkRows(prev=>prev.map(r=>({...r,quoteReason:e.target.value,quoteReasonOther:""})));
                  }} style={{ ...S.input, width:"auto", padding:"5px 10px", fontSize:12, appearance:"none", WebkitAppearance:"none", cursor:"pointer" }}>
                    <option value="">-- Select reason --</option>
                    {QUOTE_REASONS.filter(r=>r!=="Other").map(r=><option key={r} value={r}>{r}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {bulkApplyReason && bulkAllReason==="Other" && (
                    <input style={{ ...S.input, width:220, padding:"5px 10px", fontSize:12 }}
                      placeholder="Describe reason (optional)"
                      onChange={e=>{ if (bulkApplyReason) setBulkRows(prev=>prev.map(r=>({...r,quoteReasonOther:e.target.value}))); }} />
                  )}
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead><tr style={{ background:T.offwhite }}>{["#","Part / Description","Purchase Type","Qty","Competitor","Target Price","Quote Reason"].map(h=><th key={h} style={{ padding:"8px 8px", textAlign:"left", fontSize:10, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".05em", borderBottom:`2px solid ${T.lgray}` }}>{h}</th>)}</tr></thead>
                    <tbody>{bulkRows.map((row,idx)=><BulkRowEditor key={idx} row={row} idx={idx} applyAllType={bulkApplyType} applyAllReason={bulkApplyReason} onUpdate={(i,f,v)=>setBulkRows(prev=>prev.map((r,ri)=>ri===i?{...r,[f]:v}:r))} />)}</tbody>
                  </table>
                </div>
                {bulkError&&<div style={{ background:T.redLight, border:`1px solid #FCA5A5`, borderRadius:7, padding:"10px 14px", marginTop:12, color:"#991B1B" }}>{bulkError}</div>}
                <div style={{ display:"flex", gap:10, marginTop:16, alignItems:"center" }}>
                  <button style={S.btnO} onClick={()=>setBulkStep(1)}> Back</button>
                  <button style={S.btn} onClick={handleBulkRun}>Run {validBulk} Lookup{validBulk===1?"":"s"} {"->"}</button>
                  <div style={{ fontSize:12, color:validBulk>remaining?T.red:T.slate }}>Uses {validBulk} of your {remaining} remaining daily lookups{validBulk>remaining?" - exceeds limit":""}</div>
                </div>
              </div>
            </div>
          )}

          {bulkStep===3&&bulkResults&&(
            <div style={S.card}>
              <div style={S.head}>
                <span>Bulk Results - {bulkResults.length} item{bulkResults.length===1?"":"s"}  {bulkResults.filter(r=>r.noCost).length} with no cost</span>
                <button style={{ background:"rgba(255,255,255,0.15)", color:T.white, border:"none", borderRadius:5, padding:"4px 12px", fontSize:11, cursor:"pointer" }} onClick={resetBulk}>New Bulk Import</button>
              </div>
              {bulkResults.filter(r=>r.noCost).length>0&&(
                <div style={{ background:T.redLight, borderBottom:`1px solid #FCA5A5`, padding:"10px 18px", fontSize:12, color:"#991B1B" }}>
                   {bulkResults.filter(r=>r.noCost).length} item{bulkResults.filter(r=>r.noCost).length===1?"":"s"} returned no cost - please contact the pricing team.
                </div>
              )}
              <GlobalMarginBar ids={bulkEligibleIds} margins={bulkMargins} setMargins={setBulkMargins} />
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead><tr style={{ background:T.offwhite }}>{(isAdmin?["Part #","Description","Type","Qty","Cost Logic","Cost","Margin %","Sell Price","Competitor","Target $","Flag"]:["Part #","Description","Type","Qty","Cost","Margin %","Sell Price","Competitor","Target $","Flag"]).map(h=><th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:T.navyMid, textTransform:"uppercase", letterSpacing:".05em", borderBottom:`2px solid ${T.lgray}`, whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
                  <tbody>{bulkResults.map((r,idx)=><BulkResultRow key={r.id} r={r} idx={idx} margin={bulkMargins[r.id]||""} onMarginChange={(id,val)=>setBulkMargins(prev=>({...prev,[id]:val}))} isAdmin={isAdmin} />)}</tbody>
                </table>
              </div>
              <div style={{ padding:"12px 18px", borderTop:`1px solid ${T.lgray}`, display:"flex", gap:10 }}>
                <button style={S.btnO} onClick={()=>setBulkStep(2)}> Back to Edit</button>
                <button style={{ ...S.btnO, color:T.slate, borderColor:T.lgray }} onClick={resetBulk}>Start New Import</button>
              </div>
            </div>
          )}
        </>)}

        {/* --- SESSION LOG (rep's own lookups today) -------------------------- */}
        {sessionLog.length>0&&mode!=="audit"&&(
          <div style={S.card}>
            <div style={S.head}>
              <span>{isAdmin?"Your Session Log (this session only)":"My Lookups Today"} - {sessionLog.length} entr{sessionLog.length===1?"y":"ies"}</span>
              <button style={{ background:T.teal, color:T.white, border:"none", borderRadius:5, padding:"5px 14px", fontSize:11, fontWeight:700, cursor:"pointer", opacity:anySelected?1:0.45, transition:"opacity .2s" }} onClick={handleExport} disabled={!anySelected}>Export Selected (.CSV)</button>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:"#F8FAFC" }}>
                    <th style={{ padding:"7px 10px", borderBottom:`2px solid ${T.lgray}`, width:32, textAlign:"center" }}>
                      <input type="checkbox" checked={selectAll} onChange={e=>handleSelectAll(e.target.checked)} style={{ cursor:"pointer" }} />
                    </th>
                    {(isAdmin?["Part #","Description","Type","Qty","Cost Logic","Cost","Sell Price","Competitor","Target $","Source","Time"]:["Part #","Description","Type","Qty","Cost","Sell Price","Competitor","Target $","Source","Time"]).map(h=>(
                      <th key={h} style={{ padding:"7px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:T.slate, textTransform:"uppercase", letterSpacing:".05em", borderBottom:`2px solid ${T.lgray}`, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionLog.map((e,idx)=>(
                    <tr key={e.id} style={{ background:selected[e.id]?T.tealLight:idx%2===0?T.white:"#FAFBFC", borderBottom:`1px solid ${T.offwhite}` }}>
                      <td style={{ padding:"6px 10px", textAlign:"center" }}><input type="checkbox" checked={!!selected[e.id]} onChange={ev=>handleSelectOne(e.id,ev.target.checked)} style={{ cursor:"pointer" }} /></td>
                      <td style={{ padding:"6px 10px", fontWeight:700, color:T.navy, whiteSpace:"nowrap" }}>{e.partNum}</td>
                      <td style={{ padding:"6px 10px", maxWidth:150, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:T.slate }}>{e.desc}</td>
                      <td style={{ padding:"6px 10px", textTransform:"capitalize" }}>{e.purchaseType}</td>
                      <td style={{ padding:"6px 10px", textAlign:"center" }}>{e.qty||"-"}</td>
                      {isAdmin && <td style={{ padding:"6px 10px", maxWidth:170, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#0E7490", fontSize:10 }}>{e.scenario}</td>}
                      <td style={{ padding:"6px 10px", fontWeight:700 }}>{e.noCost?<span style={S.tag("red")}>No Cost</span>:`$${e.cost.toFixed(4)}`}</td>
                      <td style={{ padding:"6px 10px", color:"#065F46", fontWeight:600 }}>{e.sellPrice?fmtSell(e.sellPrice):"-"}</td>
                      <td style={{ padding:"6px 10px", color:T.slate }}>{e.competitor||"-"}</td>
                      <td style={{ padding:"6px 10px", color:T.slate }}>{e.targetPrice?`$${parseFloat(e.targetPrice).toFixed(2)}`:"-"}</td>
                      <td style={{ padding:"6px 10px" }}><span style={{ ...S.tag(e.source==="bulk"?"orange":"green"), fontSize:10 }}>{e.source}</span></td>
                      <td style={{ padding:"6px 10px", color:T.slateLight }}>{e.timestamp}</td>
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