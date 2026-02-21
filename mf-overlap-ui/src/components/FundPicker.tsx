import { useState, useMemo } from "react";
import clsx from "clsx";
import type { FundMeta } from "../types";

const MAX_SELECTED = 10;

const ASSET_CLASS_COLORS: Record<string, string> = {
  "Stock - Large-Cap Growth": "#6366f1",
  "Stock - Large-Cap Blend":  "#3b82f6",
  "Stock - Large-Cap Value":  "#0ea5e9",
  "Stock - Mid-Cap Growth":   "#8b5cf6",
  "Stock - Mid-Cap Blend":    "#a855f7",
  "Stock - Mid-Cap Value":    "#d946ef",
  "Stock - Small-Cap Growth": "#ec4899",
  "Stock - Small-Cap Blend":  "#f43f5e",
  "Stock - Small-Cap Value":  "#f97316",
  "Stock - Sector":           "#f59e0b",
  "International":            "#10b981",
  "Balanced":                 "#14b8a6",
  "Bond":                     "#64748b",
};

// Shorten labels for the legend
const LEGEND_LABELS: Record<string, string> = {
  "Stock - Large-Cap Growth": "LC Growth",
  "Stock - Large-Cap Blend":  "LC Blend",
  "Stock - Large-Cap Value":  "LC Value",
  "Stock - Mid-Cap Growth":   "MC Growth",
  "Stock - Mid-Cap Blend":    "MC Blend",
  "Stock - Mid-Cap Value":    "MC Value",
  "Stock - Small-Cap Growth": "SC Growth",
  "Stock - Small-Cap Blend":  "SC Blend",
  "Stock - Small-Cap Value":  "SC Value",
  "Stock - Sector":           "Sector",
  "International":            "International",
  "Balanced":                 "Balanced",
  "Bond":                     "Bond",
};

function acColor(assetClass: string): string {
  const entry = Object.entries(ASSET_CLASS_COLORS).find(([k]) =>
    assetClass.toLowerCase().includes(k.toLowerCase().split(" - ")[1] ?? "")
  );
  return entry?.[1] ?? "#94a3b8";
}

interface Props {
  funds: FundMeta[];
  selected: string[];
  onToggle: (symbol: string) => void;
}

export function FundPicker({ funds, selected, onToggle }: Props) {
  const [query, setQuery] = useState("");
  const [legendOpen, setLegendOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return funds;
    return funds.filter(
      (f) =>
        f.symbol.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.assetClass.toLowerCase().includes(q)
    );
  }, [funds, query]);

  // Only show legend entries that exist in this fund set
  const presentClasses = useMemo(
    () => [...new Set(funds.map((f) => f.assetClass))],
    [funds]
  );

  return (
    <div className="fund-picker">
      <div className="picker-header">
        <span className="picker-title">Select Funds</span>
        <span className="picker-badge">{selected.length}/{MAX_SELECTED}</span>
      </div>
      <input
        className="picker-search"
        type="text"
        placeholder="Search symbol, name, or class…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="picker-list">
        {filtered.map((f) => {
          const isSelected = selected.includes(f.symbol);
          const atMax = selected.length >= MAX_SELECTED;
          const disabled = !isSelected && atMax;
          const dotColor = acColor(f.assetClass);
          return (
            <li
              key={f.symbol}
              className={clsx("picker-item", {
                "picker-item--selected": isSelected,
                "picker-item--disabled": disabled,
              })}
              onClick={() => !disabled && onToggle(f.symbol)}
            >
              {/* Dot with tooltip showing full asset class */}
              <span className="picker-dot-wrap">
                <span
                  className="picker-dot"
                  style={{ background: dotColor }}
                />
                <span
                  className="picker-dot-tip"
                  style={{ "--dot-color": dotColor } as React.CSSProperties}
                >
                  {f.assetClass}
                </span>
              </span>
              <span className="picker-symbol">{f.symbol}</span>
              <span className="picker-name">{f.name.replace(" Admiral Shares", "")}</span>
              {isSelected && <span className="picker-check">✓</span>}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="picker-empty">No funds match "{query}"</li>
        )}
      </ul>

      {/* Legend */}
      <div className="legend-section">
        <button
          className="legend-toggle"
          onClick={() => setLegendOpen((o) => !o)}
        >
          <span>Asset Class Legend</span>
          <span className="legend-toggle-arrow">{legendOpen ? "▲" : "▼"}</span>
        </button>
        {legendOpen && (
          <div className="legend-grid">
            {Object.entries(ASSET_CLASS_COLORS)
              .filter(([k]) => presentClasses.some((c) => c === k || c.includes(k.split(" - ")[1] ?? "")))
              .map(([key, color]) => (
                <span key={key} className="legend-item">
                  <span className="legend-swatch" style={{ background: color }} />
                  <span className="legend-label">{LEGEND_LABELS[key] ?? key}</span>
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
