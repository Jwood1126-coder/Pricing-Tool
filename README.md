# Brennan Industries — Part Cost Lookup Tool

Internal tool for sales reps to look up part costs, apply margins, calculate sell
prices, and log pricing decisions with an admin audit trail. Single + bulk lookup,
customer tracking, CSV export.

> **Interim tooling.** Data is loaded from user-uploaded CSV files and stored
> locally in the browser/app (IndexedDB). This is scaffolding while the NetSuite
> integration is built — see [Roadmap](#roadmap). See [CLAUDE.md](CLAUDE.md) for
> engineering conventions and the pricing business rules.

## Getting the app (.exe)

Every push to `main` triggers a GitHub Actions build (`.github/workflows/build.yml`).
To get the Windows executable:

1. Open the repo's **Actions** tab → latest **Build Windows EXE** run.
2. Download the **BrennanPricingTool-portable** artifact.
3. Unzip and run the `.exe` — it's a portable build, no installer needed.

(You can also trigger a build manually via **Run workflow** on that page.)

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

## Architecture

```
src/
  App.jsx            Root: login, nav, single/bulk lookup flows, session log
  components/        LoginScreen, DataManagement, ColumnMapper, SettingsPanel,
                     AuditPanel, shared.jsx (CompetitorField, CustomerNumberInput, …)
  data/
    schema.js        Canonical record shapes + mappable fields per dataset (the contract)
    db.js            IndexedDB layer (idb) — keyed stores, chunked bulk writes
    store.js         High-level data API (the single seam; swaps to NetSuite later)
    parser.js        CSV parsing (PapaParse, in a worker for large files)
  utils/
    pricing.js       buildScenario, calcSell, totalInv  (pure, unit-tested)
    format.js        csvSafe (fixed), toCSV  (pure, unit-tested)
    export.js        CSV download
  styles/tokens.js   colors + shared style objects
electron/            desktop shell (main.cjs, preload.cjs)
legacy/              original single-file prototype, kept for reference
```

## Known limitations

- Data lives only on the machine that uploaded it (local IndexedDB) — not shared
  between users. This is intentional for the interim phase.
- Simple user-selector "login" (no passwords) — internal testing only.
- `.csv` only. Export from Excel as CSV if your source is `.xlsx`.

## Roadmap

Replace the CSV/IndexedDB data layer (`src/data/store.js`) with live NetSuite
queries (customer/part search via Suitelet endpoints). The pricing logic in
`src/utils/pricing.js` stays unchanged. `store.js` is the single seam to swap.
