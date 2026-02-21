import { useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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

const RISK_COLORS = ["", "#22c55e", "#4ade80", "#facc15", "#f59e0b", "#ef4444"];

function RiskTrack({ level }: { level: number }) {
  const color = RISK_COLORS[level] ?? "#94a3b8";
  return (
    <span className="risk-track">
      {Array.from({ length: 5 }, (_, i) => {
        const pos = i + 1;
        const active = pos === level;
        return (
          <span key={pos} className={active ? "risk-node risk-node--active" : "risk-node"}>
            {active ? (
              <span className="risk-bubble" style={{ background: color, color: "#000" }}>
                {level}
              </span>
            ) : (
              <span className="risk-pip" />
            )}
          </span>
        );
      })}
    </span>
  );
}

function returnColor(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return "var(--text2)";
  return n >= 0 ? "#4ade80" : "#f87171";
}

function FundTooltip({ fund }: { fund: FundMeta }) {
  const dotColor = acColor(fund.assetClass);
  const navDir = fund.nav.direction === "up";
  return (
    <div className="fund-tip-inner">
      <div className="fund-tip-header">
        <span className="fund-tip-symbol">{fund.symbol}</span>
        <span className="fund-tip-name">{fund.name.replace(" Admiral Shares", "")}</span>
      </div>

      <span
        className="fund-tip-class"
        style={{ background: dotColor + "22", color: dotColor, borderColor: dotColor + "55" }}
      >
        {fund.assetClass}
      </span>

      <div className="fund-tip-row">
        <span className="fund-tip-lbl">NAV</span>
        <span className="fund-tip-val">
          {fund.nav.price}
          <span style={{ color: navDir ? "#4ade80" : "#f87171", marginLeft: 5 }}>
            {navDir ? "▲" : "▼"} {fund.nav.change} ({fund.nav.changePct})
          </span>
        </span>
      </div>

      <div className="fund-tip-row">
        <span className="fund-tip-lbl">Risk</span>
        <RiskTrack level={fund.riskLevel ?? 0} />
      </div>

      <div className="fund-tip-row">
        <span className="fund-tip-lbl">Expense</span>
        <span className="fund-tip-val" style={{ color: "#4ade80" }}>{fund.expenseRatio}</span>
      </div>

      <div className="fund-tip-row">
        <span className="fund-tip-lbl">Yield</span>
        <span className="fund-tip-val">{fund.yield.pct} <span style={{ color: "var(--text2)", fontSize: 10 }}>({fund.yield.type})</span></span>
      </div>

      <div className="fund-tip-divider" />

      <div className="fund-tip-returns-title">Returns</div>
      <div className="fund-tip-returns">
        {(
          [
            ["YTD",  fund.returns.ytd],
            ["1 yr", fund.returns.oneYear],
            ["5 yr", fund.returns.fiveYear],
            ["10 yr", fund.returns.tenYear],
          ] as [string, string][]
        ).map(([label, val]) => (
          <div key={label} className="fund-tip-ret-row">
            <span className="fund-tip-ret-lbl">{label}</span>
            <span className="fund-tip-ret-val" style={{ color: returnColor(val) }}>{val}</span>
          </div>
        ))}
      </div>

      <div className="fund-tip-divider" />

      <div className="fund-tip-row">
        <span className="fund-tip-lbl">Min invest</span>
        <span className="fund-tip-val">{fund.minInvestment}</span>
      </div>
      <div className="fund-tip-row">
        <span className="fund-tip-lbl">Inception</span>
        <span className="fund-tip-val">{fund.returns.inceptionDate}</span>
      </div>
    </div>
  );
}

export function FundPicker({ funds, selected, onToggle }: Props) {
  const [query, setQuery] = useState("");
  const [hoveredFund, setHoveredFund] = useState<FundMeta | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

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

  const handleItemEnter = useCallback((e: React.MouseEvent, f: FundMeta) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredFund(f);
    // Keep tooltip inside the sidebar — find the sidebar's right edge via the
    // picker root element's bounding rect so the tooltip never covers the diagram.
    const pickerEl = (e.currentTarget as HTMLElement).closest(".fund-picker");
    const sidebarRight = pickerEl
      ? pickerEl.getBoundingClientRect().right
      : rect.right;
    const TIP_H = 330;
    const TIP_W = 248;
    // Horizontally: align with list item left, but clamp so right edge ≤ sidebarRight
    const x = Math.max(4, Math.min(rect.left + 4, sidebarRight - TIP_W - 4));
    // Vertically: prefer above the item; fall back to below
    const spaceAbove = rect.top - TIP_H - 8;
    const y = spaceAbove > 60 ? spaceAbove : Math.min(rect.bottom + 6, window.innerHeight - TIP_H - 8);
    setTipPos({ x, y });
  }, []);

  const handleItemLeave = useCallback(() => {
    setHoveredFund(null);
    setTipPos(null);
  }, []);

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
              onMouseEnter={(e) => handleItemEnter(e, f)}
              onMouseLeave={handleItemLeave}
            >
              {/* Dot with tooltip showing full asset class */}
              <span className="picker-dot-wrap">
                <span
                  className="picker-dot"
                  style={{ background: dotColor }}
                />
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

      {/* Rich fund tooltip portal */}
      {hoveredFund && tipPos && createPortal(
        <div
          ref={tipRef}
          className="fund-tip"
          style={{ left: tipPos.x, top: tipPos.y }}
        >
          <FundTooltip fund={hoveredFund} />
        </div>,
        document.body
      )}
    </div>
  );
}
