# CLAUDE.md — Pricing-Tool

Operating manual for working in this repo. Read this before touching code.

---

## 1. What this is

**Brennan Industries Part Cost Lookup Tool.** An internal tool that lets sales reps
look up part costs, apply margins, calculate sell prices, and log pricing decisions
with an admin audit trail. Single-lookup and bulk modes, customer tracking, CSV export.

**Status: interim scaffolding.** The CSV-as-database pattern is temporary. The real
backend is NetSuite (see the `NOTE FOR NETSUITE DEVELOPER` comments in the legacy code).
This tool exists to validate the workflow with real reps while that integration is built.
Do not over-engineer for permanence — optimize for *correctness of the pricing logic* and
*speed of iteration*.

**Current reality (as of this writing):** all logic lives in one file, `main` (no
extension, ~1400 lines of React JSX). It has no build system, no `package.json`, no HTML
shell — it cannot run. Everything (users, customers, parts, audit log) is hardcoded demo
data. The active work is to make it runnable, refactored, and fed by user-uploaded files.

---

## 2. How to work here — the Karpathy method

These are the operating principles for this repo. They're adapted from Andrej Karpathy's
engineering practice (nanoGPT, micrograd, llm.c, *"A Recipe for Training Neural Networks"*,
and his talks on AI-assisted coding). They are not decoration — follow them.

### 2.1 Keep it on a tight leash
Make **small, incremental changes** and verify each one before the next. Never produce a
large diff that can't be reviewed line-by-line. After every meaningful change, the app must
still **run**. A broken-but-large change is worse than a small working one. When in doubt,
do less, confirm it works, continue.

> "The most common failure mode is writing too much code before running it." Resist it.

### 2.2 Become one with the data first
Before writing a parser, a mapper, or a schema — **look at the actual data**. Open a sample
CSV. Count the columns. Find the messy rows (empty cells, quoted commas, weird headers,
inventory spread across many columns). The hard parts of this project are all in the data
shape (see §5). Understand it concretely before designing for it. Don't code against an
imagined file format.

### 2.3 Build the end-to-end skeleton, then a dumb baseline
Get the **simplest possible thing working top-to-bottom first**, then add complexity one
piece at a time. Concretely for this repo: make the *existing monolith run unchanged* in a
real build before refactoring anything. A running ugly app beats a beautiful broken one.
Only once it boots and you can click through it do you start splitting files — and you
re-run after each split.

### 2.4 Distrust and verify — assume it's broken until proven otherwise
Code fails silently. The `csvSafe` bug (strips every hyphen from part numbers) sat in
"working" code. So:
- After a change, actually exercise the path — upload a file, click the button, read the output.
- Add asserts / validation at boundaries (parse, map, persist). Surface bad data loudly; never silently drop or mangle rows.
- The pricing math is the product. **Unit-test the pure functions** (`buildScenario`,
  `calcSell`, `csvSafe`, CSV parse). They're cheap to test and must be correct.

### 2.5 Make state observable
Don't trust invisible state. When debugging, make it visible — log it, render it, inspect
it. The "Data Management" screen (row counts, last-upload dates, what's loaded) is an
application of this principle: the user should always be able to *see* what state the tool
is in. Build for inspectability.

### 2.6 Minimalism — less code, fewer dependencies
Prefer the smallest solution that works. Every dependency is a liability you carry
(security, build weight, breakage). Don't add a library, an abstraction, or a state-
management framework until the pain is real and present. nanoGPT is ~300 lines on purpose.
Resist premature abstraction: write it concretely twice before you generalize it once.

### 2.7 Reproducibility and a fast iteration loop
The thing you optimize hardest is the **dev feedback loop**. `npm run dev` should hot-reload
in milliseconds. Anything that slows the loop (a heavy packaging step you run constantly,
a manual data-reset dance) is worth fixing first. Determinism matters: a "Clear All Data"
reset that returns the app to a known-empty state is a debugging tool, not just a feature.

### 2.8 Understand before you change
Don't refactor code you haven't read and understood. Don't accept a generated change you
can't explain. If you're moving the pricing logic, you must be able to state the business
rule it encodes (see §6) and confirm the move preserves it exactly.

---

## 3. Stack & commands

> Filled in as scaffolding lands. Target stack: **Vite + React**. Packaging target is a
> Windows desktop binary (see §4 for the open tradeoff). CSV-first; `.xlsx` only if required.

```
npm install         # install deps
npm run dev         # dev server, hot reload — the primary loop
npm run build       # production web build
npm run test        # unit tests (pricing/parse utils) — add these
# npm run package   # build the distributable binary (TBD per §4)
```

---

## 4. Architecture (target)

The monolith splits into pure-function utils, a data/persistence layer, and presentational
components. The dependency arrow points one way: **components → data/utils**, never back.

```
src/
  main.jsx            React entry / root mount
  App.jsx             Root: routing/mode switching, top-level app state
  components/         Presentational UI (LoginScreen, SingleLookup, BulkImport,
                      AuditPanel, SessionLog, DataManagement, ColumnMapper,
                      FileUploader, SettingsPanel, shared/)
  data/
    store.js          Persistence read/write layer (see §4.1)
    parsers.js        CSV/Excel -> rows/columns
    schema.js         Canonical internal shape + required fields per data type (the CONTRACT)
  utils/
    pricing.js        buildScenario, calcSell, totalInv  (PURE — unit tested)
    format.js         fmtSell, csvSafe (FIXED), formatting  (PURE — unit tested)
    export.js         CSV export (proper quoting/escaping)
  styles/
    tokens.js         T (colors) and S (shared style objects), lifted verbatim
electron/ or src-tauri/   desktop shell (per §4 decision)
```

**Key principle:** `schema.js` is the contract. Every uploaded dataset is normalized to the
canonical internal shape defined there; the column mapper maps *to* that shape; everything
downstream (pricing, history, export) reads only the canonical shape. Lock this first.

### 4.1 Persistence note (read before choosing localStorage)
`localStorage` is synchronous, serializes the whole JSON on every write, and caps at
~5–10 MB. A real parts DB (thousands of parts × inventory across many locations) can blow
past that and make writes janky. Prefer **IndexedDB** (a thin wrapper like `idb`) for the
bulk datasets; `localStorage` is fine for small things (current user, settings, session
flags). Keep `store.js` as the single seam so the backing store can change without touching
callers — and so swapping to NetSuite later is a one-file change.

---

## 5. The data-shape problem (the actually-hard part)

Parts carry **inventory across N locations** (today: `PC10`…`PC60`). The requirement is to
auto-detect locations from uploaded data, which means the column mapper can't be a fixed
"Column A → Part Number" form. Decide the expected CSV shape up front:

- **Wide** (one column per location): the mapper must let the user tag a *set* of columns
  as "location inventory," deriving the location code from each header.
- **Long** (`partNum, location, qty` rows): simpler to map, requires pivoting on import.

Pick one, write it in `schema.js`, and design the mapper around it. This is where the
project's real complexity lives — §2.2 (become one with the data) applies hardest here.

Also: **persist the column mapping per data type** so re-uploading the same file format
doesn't force re-mapping. Auto-suggest mappings by fuzzy header match, then let the user
confirm/correct — don't silently guess (§2.4), but don't make them start from scratch each time.

---

## 6. Pricing logic — the business rules (must be preserved exactly)

From `buildScenario` / `calcSell` in the legacy file. This is the product; do not alter the
rules during refactor without explicit sign-off.

- **Sell price:** `cost / (1 - margin)`, valid only for `0 < margin < 1`. (`calcSell`)
- **Floor margin:** `0.40`. Below it ⇒ flag "below 40% floor" (do not block, just flag).
- **No cost available** (no avg AND no replacement cost): flag as "No Cost", contact pricing.
- **Recurring purchase:** use **Replacement Cost** (flag if missing).
- **Spot buy:**
  - With requested qty: let `pct = totalInventory / qty`.
    `pct >= 0.70` ⇒ **Average Cost**; `pct < 0.70` ⇒ **Replacement Cost**.
  - Without qty: `totalInventory >= 100` ⇒ **Average Cost**; `< 100` ⇒ **Replacement Cost**.
  - In each branch, fall back to "No Cost" if the chosen cost field is missing.
- **Daily limit:** 100 lookups/user/day. **Bulk limit:** 25 items/batch. (Make admin-configurable.)

---

## 7. Bug status (original prototype issues)

All resolved in the refactor — listed for history:

1. ✅ **`csvSafe` hyphen-stripping** — fixed; `csvSafe`/`toCSV` in [format.js](src/utils/format.js)
   now do RFC-4180 escaping and preserve characters. Unit-tested.
2. ✅ **Step numbering** — clean 1→2→3→4 in [App.jsx](src/App.jsx).
3. ✅ **No persistence** — IndexedDB via [db.js](src/data/db.js) / [store.js](src/data/store.js).
4. ✅ **Naive CSV parsing** — PapaParse in [parser.js](src/data/parser.js) (BOM-safe, quoted-comma-safe, worker).
5. ✅ **ID collisions** — `crypto.randomUUID()` (`uid()` in App.jsx); bulk timestamps are `ts + i`.
6. ✅ **Real timestamps** — each log entry stores its own `ts` once at creation.
7. ✅ **Customer matching** — `filterHistory()` prefers stable `customerNum`, only falls back to name.
8. ✅ **Hardcoded data** — all data comes from uploads/settings; empty by default with guided setup.

### Real-data parsing (the paramount concern)
Real CSVs carry `$`, thousands commas, blanks, and unit suffixes. Two helpers in
[format.js](src/utils/format.js) handle this; **use them for any numeric/qty cell**:
- `parseNumeric(v)` — costs. Strips `$`/commas/whitespace. Returns **null for missing**
  (distinct from a real `0`), so a blank cost isn't silently turned into 0 → false "No Cost".
- `parseQty(v)` — quantities/inventory. Tolerates `"1,000"`, `" 500 "`, `"500 ea"`; null if no integer.
`normalizeRow` (schema.js) and `buildScenario` (pricing.js) both route through these. US number
format is assumed (`,`=thousands, `.`=decimal).

## 8. NetSuite seam (keep this clean)

The whole point is that swapping IndexedDB → NetSuite is a [store.js](src/data/store.js)-only
change. Rules to preserve that:
- **No component imports `db.js` directly.** UI talks to `store.js` only.
- **Customer search is async**: `store.searchCustomers(query)` (cursor today, Suitelet later).
  `CustomerNumberInput` takes an `onSearch` callback — it does NOT assume all customers are in
  memory. Do not reintroduce an all-customers-in-memory list.
- **Part lookup is async + keyed**: `getPart`/`getParts` map onto a NetSuite item search.
- Costs are normalized to `{ avgCost, repCost }` at the import/seam boundary; if NetSuite uses
  different cost fields, map them to these in `store.js`, not in the UI or `pricing.js`.

---

## 9. The legacy file

The original 1400-line prototype lives at [legacy/main.original.jsx](legacy/main.original.jsx)
for reference. Don't import from it; git history is the real preservation.

---

## 10. Don't gold-plate

This is throwaway scaffolding until NetSuite. Keep docs lean (git log is your changelog).
Spend effort where it matters: **correct pricing math, correct data import, fast iteration,
clear empty/error states.** Skip ceremony that a temporary internal tool doesn't need.
