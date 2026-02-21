# mf-overlap-ui

React + TypeScript + Vite application for the [Vanguard Fund Overlap Explorer](../README.md).

## Development

```bash
npm install
npm run dev       # syncs data files + starts Vite dev server at localhost:5173
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Sync data, start dev server |
| `npm run build` | Sync data, type-check, Vite build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run sync-data` | Copy `../mutual-funds.json` and `../holdings/*.json` into `public/` |

## Data flow

Static JSON files are served from `public/` at runtime:

```
public/
├── mutual-funds.json      ← copied from repo root by sync-data.mjs
└── holdings/
    ├── vtsax.json         ← copied from ../holdings/*.json
    └── ...
```

`sync-data.mjs` copies these files from the parent directory (`../`) before each build or dev session. They are listed in `.gitignore` and regenerated on every build.

## Project structure

```
src/
├── App.tsx                     # Root component, state management
├── types.ts                    # TypeScript types
├── components/
│   ├── ChordDiagram.tsx        # D3 v7 chord diagram
│   ├── FundPicker.tsx          # Searchable fund selector (sidebar)
│   ├── HoldingsTables.tsx      # Shared holdings detail panel
│   ├── FundTooltipPopup.tsx    # Hover tooltip on chord arcs
│   └── OverlapMatrix.tsx       # Overlap percentage matrix
└── lib/
    ├── data.ts                 # loadFundList() / loadHoldings()
    ├── overlap.ts              # Overlap matrix calculation
    ├── colors.ts               # Fund color palette
    └── id.ts                   # Stable fund ID helpers
```
