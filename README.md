# Vanguard Fund Overlap Explorer

A web application that lets you compare holdings overlap across Vanguard mutual funds — see exactly how much two or more funds share in common, visualized as an interactive chord diagram.

**Live app:** [Deploy your own on Vercel](#deploying-to-vercel)

---

## What it does

Pick 2–10 Vanguard mutual funds and the app will:

- Compute the **percentage overlap** between every pair of funds by matching individual holdings via ticker or ISIN
- Render an interactive **D3 chord diagram** where arc thickness represents overlap weight
- Show a **holdings table** of shared securities — the actual stocks or bonds both funds own
- Let you drill into any **pair** to see their specific shared holdings
- Filter by **Stocks**, **Bonds**, or **All** holdings
- Automatically detect and flag **fund-of-funds** (e.g. LifeStrategy funds) that hold other funds rather than individual securities, and exclude them from overlap math

---

## Repository structure

```
vanguard/
├── mutual-funds.json          # Metadata for 34 Vanguard mutual funds
├── etfs.json                  # Metadata for 56 Vanguard ETFs
├── holdings/                  # Per-fund holdings data
│   ├── vtsax.json             # e.g. VTSAX: ~3,480 holdings
│   ├── vfiax.json
│   └── ...                    # 35 mutual fund holdings files
│   └── etfs/                  # 56 ETF holdings files
│       ├── vti.json
│       ├── voo.json
│       └── ...
├── mf-overlap-ui/             # React + Vite web application
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChordDiagram.tsx   # D3 chord diagram
│   │   │   ├── FundPicker.tsx     # Searchable fund selector
│   │   │   ├── HoldingsTables.tsx # Shared holdings table
│   │   │   └── OverlapMatrix.tsx
│   │   └── lib/
│   │       ├── overlap.ts         # Overlap calculation logic
│   │       └── data.ts            # Data loading utilities
│   └── scripts/
│       └── sync-data.mjs          # Copies JSON data into public/
├── vercel.json                # Vercel deployment config
├── etfs-1.html                # Source HTML scraped from Vanguard (ETFs)
└── mutual-funds-1.html        # Source HTML scraped from Vanguard (MFs)
```

---

## Data

Each holdings file (e.g. `holdings/vtsax.json`) contains:

```json
{
  "symbol": "VTSAX",
  "name": "Vanguard Total Stock Market Index Fund",
  "assetClass": "Domestic Stock",
  "asOfDate": "2025-01-31",
  "holdingsCount": { "stock": 3480, "bond": 0, "total": 3480 },
  "holdings": [
    {
      "ticker": "MSFT",
      "isin": "US5949181045",
      "name": "Microsoft Corp.",
      "percentWeight": 5.84
    }
  ]
}
```

The fund list files (`mutual-funds.json`, `etfs.json`) contain metadata including expense ratio, yield, risk level, and return history.

---

## Running locally

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
cd mf-overlap-ui
npm install

# Start dev server (auto-syncs data files, then starts Vite)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The `sync-data` script copies `../mutual-funds.json` and `../holdings/*.json` into `mf-overlap-ui/public/` so Vite can serve them as static assets.

---

## Deploying to Vercel

This repo includes a `vercel.json` at the root that configures Vercel automatically.

### Steps

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repository
4. **Do not change any settings** — `vercel.json` already configures the build command and output directory
5. Click **Deploy**

Vercel will:
- Run `npm install` in `mf-overlap-ui/`
- Run `npm run build` (which syncs data files, then runs Vite)
- Serve the output from `mf-overlap-ui/dist/`

### What `vercel.json` does

```json
{
  "buildCommand": "npm --prefix mf-overlap-ui install && npm --prefix mf-overlap-ui run build",
  "outputDirectory": "mf-overlap-ui/dist",
  "installCommand": "echo 'root install skipped'",
  "framework": null
}
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 7 |
| Visualization | D3 v7 (chord diagram) |
| Styling | Plain CSS (no framework) |
| Hosting | Vercel |

---

## Mutual funds included

VASGX · VASIX · VBIAX · VDADX · VEMAX · VEUSX · VEXAX · VFIAX · VFSAX · VFTAX · VFWAX · VGRLX · VGSLX · VHYAX · VIAAX · VIGAX · VIHAX · VIMAX · VLCAX · VMGMX · VMVAX · VPADX · VSCGX · VSGAX · VSIAX · VSMAX · VSMGX · VTCLX · VTIAX · VTMFX · VTMGX · VTMSX · VTSAX · VTWAX · VVIAX
