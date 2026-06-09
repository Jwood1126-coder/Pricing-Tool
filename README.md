# Brennan Industries — Part Cost Lookup Tool

Internal tool for sales reps to look up part costs, apply margins, calculate sell
prices, and log pricing decisions with an admin audit trail. Single + bulk lookup,
customer tracking, CSV export.

> **Interim tooling.** Data is loaded from user-uploaded CSV files and stored
> locally in the browser/app (IndexedDB). This is scaffolding while the NetSuite
> integration is built — see [Roadmap](#roadmap). See [CLAUDE.md](CLAUDE.md) for
> engineering conventions and the pricing business rules.

## Getting the app (.exe)

CI is GitHub Actions (`.github/workflows/build.yml`), which builds on Windows.

**For users (recommended):** download the latest **[Release](../../releases/latest)** and
run `BrennanPricingTool-<version>.exe` — it's a portable build, no installer needed.

**To publish a new release:** bump `version` in `package.json`, commit, then push a
matching version tag — that triggers the build and publishes a Release with the `.exe`:

```bash
git tag -a v0.1.2 -m "v0.1.2" && git push origin v0.1.2
```

**Per-commit builds:** every push to `main` also uploads the `.exe` as an artifact on the
**Actions** tab (handy for testing without cutting a release).

## Run / develop locally

```bash
npm install
npm run dev          # web dev server at http://localhost:5173 (fast iteration loop)
npm run electron:dev # run inside the Electron desktop shell
npm test             # unit tests for the pricing/format logic
npm run build        # production web build -> dist/
npm run package      # build the portable Windows .exe -> release/  (run on Windows)
```

## First-time setup (loading data)

The app **starts empty**. An admin loads data via **Data Setup** (button on the
login screen) or the **Data** tab once logged in:

1. Upload a **Users** CSV first (so there are accounts to log in as).
2. Upload **Parts**, **Customers**, and **Competitors** CSVs.
3. For each file you **map your columns** to the required fields. Nothing is
   guessed — you choose which column is which.

| Dataset      | Required fields            | Optional fields                          |
|--------------|----------------------------|------------------------------------------|
| Parts        | Part Number                | Description, Average Cost, Replacement Cost, **+ inventory-by-location columns** |
| Customers    | Customer Number, Name      | —                                        |
| Users        | Full Name                  | Title, Role (`admin`/`rep`), Initials    |
| Competitors  | Competitor Name            | —                                        |

**Parts inventory:** in the mapper, tick every column that holds on-hand quantity
for a location. Each ticked column becomes a location named by its header
(e.g. a `PC10` column → location `PC10`). Locations are auto-detected from these.

Re-uploading a dataset **replaces** it. **Clear All Data / Reset** (Data tab) wipes
everything. Built and tested for **100k+ parts** — parts live in a keyed IndexedDB
store, so a lookup is a direct indexed read, not a full scan.

## Source code tour (for anyone taking over)

All hand-written code lives in **`src/`** (`src` = *source*). Everything else is
generated or tooling: `dist/` is Vite's build output, `node_modules/` is downloaded
dependencies, `release/` is the packaged `.exe` — none of those are committed.

**Dependency direction is one-way:** UI (`components/`) → logic/data (`data/`, `utils/`)
→ shared (`styles/`, `constants`). Nothing in `data/` or `utils/` reaches back into the
UI. That's what makes the data layer swappable for NetSuite without touching the UI.

### Entry + root
- **`src/main.jsx`** — ignition. Mounts `<App/>` into the page. (Vite loads this first.)
- **`src/App.jsx`** — the controller / "brain." Holds app state (current user, mode,
  current lookup, session log), the handlers (`handleLookup`, `handleBulkRun`,
  `handleExport`, …), decides which screen to show, and renders the single-lookup and
  bulk-import flows. This is the file to start with.

### `src/components/` — the screens (UI)
Each receives data as props and calls back up to `App.jsx`.
- **`LoginScreen.jsx`** — account picker (or a "Data Setup" prompt when nothing's loaded).
- **`DataManagement.jsx`** — the **Data** tab: upload a CSV per dataset, see row counts /
  last-upload, clear or reset. Drives the upload flow.
- **`ColumnMapper.jsx`** — after a file is picked, map your columns to the required fields
  and tick which columns are inventory-by-location.
- **`SettingsPanel.jsx`** — admin settings: floor margin, daily limit, bulk limit.
- **`AuditPanel.jsx`** — admin audit trail: filters, full log table, CSV export, clear log.
- **`shared.jsx`** — reusable widgets used across screens: `CustomerNumberInput`
  (autocomplete), `CompetitorField`, `DailyBadge`, `StepDot`, `GlobalMarginBar`,
  `BulkRowEditor`, `BulkResultRow`, `PricingHistoryTab`.

### `src/data/` — the data layer (the NetSuite seam)
- **`schema.js`** — **the contract.** Canonical record shapes, which fields are required
  per dataset, and `normalizeRow()` (turns one messy CSV row into a clean record —
  e.g. `"$5,432.10"` → `5432.1`).
- **`parser.js`** — reads CSV files via PapaParse: `previewCSV` (header + few rows for
  mapping) and `parseCSV` (full file, streamed in a worker so 100k rows don't freeze).
- **`db.js`** — the **only** file that touches IndexedDB (keyed stores, chunked bulk
  writes, full wipe). Never import this from a component.
- **`store.js`** — the high-level API the UI calls (`getPart`, `searchCustomers`,
  `importDataset`, `getSettings`, `appendLog`, …). **The single seam:** to move to
  NetSuite, rewrite this file's internals and nothing else changes.

### `src/utils/` — pure logic (no UI, no DB; easy to test)
- **`pricing.js`** — the business rules: `buildScenario` (which cost to use),
  `calcSell` (`cost / (1 - margin)`), `totalInv`. Preserved exactly from the original.
- **`format.js`** — `csvSafe`/`toCSV` (correct CSV escaping) and the real-data parsers
  `parseNumeric`/`parseQty` (tolerate `$`, commas, blanks, BOM).
- **`export.js`** — triggers a CSV file download.

### Shared
- **`src/styles/tokens.js`** — `T` (colors) and `S` (shared style objects).
- **`src/constants.js`** — small fixed lists (e.g. quote reasons).

### Tests (`*.test.js`, run with `npm test`)
- `utils/pricing.test.js`, `utils/format.test.js` — pricing math + real-data parsing.
- `data/schema.test.js` — the messy-CSV → correct-pricing pipeline end to end.
- `data/parser.test.js` — the CSV BOM-handling regression.

### Outside `src/`
- **`electron/`** — desktop shell (`main.cjs` opens the window and loads the built app;
  `preload.cjs` is reserved for future IPC).
- **`legacy/main.original.jsx`** — the original single-file prototype, kept for reference.

### How a request flows through the files
- **Upload a parts file:** `DataManagement` → `parser.previewCSV` → `ColumnMapper`
  (you map columns) → `parser.parseCSV` → `schema.normalizeRow` → `store.importDataset`
  → `db.replaceStore` (IndexedDB).
- **A single lookup:** type part # in `App.jsx` → `handleLookup` → `store.getPart` →
  `db.js` → pick spot/recurring + qty → `handleCalc` → `pricing.buildScenario` (which
  cost) → render + `pricing.calcSell`/`format.fmtSell` → "Save to Log" → `store.appendLog`
  → shows in the session log + `AuditPanel`, exportable via `export.js`.

## Known limitations

- Data lives only on the machine that uploaded it (local IndexedDB) — not shared
  between users. This is intentional for the interim phase.
- Simple user-selector "login" (no passwords) — internal testing only.
- `.csv` only. Export from Excel as CSV if your source is `.xlsx`.

## Roadmap

Replace the CSV/IndexedDB data layer (`src/data/store.js`) with live NetSuite
queries (customer/part search via Suitelet endpoints). The pricing logic in
`src/utils/pricing.js` stays unchanged. `store.js` is the single seam to swap.
