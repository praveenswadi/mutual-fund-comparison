/**
 * Shared rich fund-info tooltip, used by FundPicker and HoldingsTables.
 *
 * Usage:
 *   1. Attach onMouseEnter / onMouseLeave to any element that should trigger it.
 *   2. Render <FundTooltipPortal fund={hoveredFund} pos={tipPos} /> anywhere.
 */
import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { FundMeta } from "../types";

// ─── Asset-class color map (shared with FundPicker dot colors) ───────────────
export const ASSET_CLASS_COLORS: Record<string, string> = {
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

export function acColor(assetClass: string): string {
  const entry = Object.entries(ASSET_CLASS_COLORS).find(([k]) =>
    assetClass.toLowerCase().includes(k.toLowerCase().split(" - ")[1] ?? "")
  );
  return entry?.[1] ?? "#94a3b8";
}

// ─── Risk track ──────────────────────────────────────────────────────────────
const RISK_COLORS = ["", "#22c55e", "#4ade80", "#facc15", "#f59e0b", "#ef4444"];

export function RiskTrack({ level }: { level: number }) {
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

// ─── Tooltip content ─────────────────────────────────────────────────────────
function returnColor(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return "var(--text2)";
  return n >= 0 ? "#4ade80" : "#f87171";
}

export function FundTooltipContent({ fund }: { fund: FundMeta }) {
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
        <span className="fund-tip-val">
          {fund.yield.pct}{" "}
          <span style={{ color: "var(--text2)", fontSize: 10 }}>({fund.yield.type})</span>
        </span>
      </div>

      <div className="fund-tip-divider" />

      <div className="fund-tip-returns-title">Returns</div>
      <div className="fund-tip-returns">
        {(
          [
            ["YTD",   fund.returns.ytd],
            ["1 yr",  fund.returns.oneYear],
            ["5 yr",  fund.returns.fiveYear],
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

// ─── Portal wrapper ───────────────────────────────────────────────────────────
interface FundTooltipPortalProps {
  fund: FundMeta | null;
  pos: { x: number; y: number } | null;
}

export function FundTooltipPortal({ fund, pos }: FundTooltipPortalProps) {
  if (!fund || !pos) return null;
  return createPortal(
    <div className="fund-tip" style={{ left: pos.x, top: pos.y }}>
      <FundTooltipContent fund={fund} />
    </div>,
    document.body
  );
}

// ─── Hook: useHoverFundTip ────────────────────────────────────────────────────
/**
 * Returns event handlers and state for a hover-triggered fund tooltip.
 * `containerRef` should be the ref of the nearest container whose right edge
 * acts as the clamping boundary (keeps tip inside the sidebar, etc.).
 * Pass null to skip clamping (tooltip will appear to the right of the element).
 */
export function useHoverFundTip(containerRef?: React.RefObject<HTMLElement | null>) {
  const [hoveredFund, setHoveredFund] = useState<FundMeta | null>(null);
  const [tipPos, setTipPos]           = useState<{ x: number; y: number } | null>(null);
  const tipRef                        = useRef<HTMLDivElement>(null);

  const onEnter = useCallback((e: React.MouseEvent, fund: FundMeta) => {
    const rect      = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const TIP_H     = 330;
    const TIP_W     = 248;

    let x: number;
    let y: number;

    if (containerRef !== undefined) {
      // Sidebar mode: clamp so tooltip doesn't overflow past container right edge
      const containerRight = containerRef?.current
        ? containerRef.current.getBoundingClientRect().right
        : (e.currentTarget as HTMLElement).closest(".fund-picker")?.getBoundingClientRect().right ?? rect.right;
      x = Math.max(4, Math.min(rect.left + 4, containerRight - TIP_W - 4));
      const spaceAbove = rect.top - TIP_H - 8;
      y = spaceAbove > 60
        ? spaceAbove
        : Math.min(rect.bottom + 6, window.innerHeight - TIP_H - 8);
    } else {
      // Free-floating: appear to the right of the element, clamped to viewport
      x = Math.min(rect.right + 8, window.innerWidth - TIP_W - 8);
      y = Math.min(rect.top, window.innerHeight - TIP_H - 8);
    }

    setHoveredFund(fund);
    setTipPos({ x, y });
  }, [containerRef]);

  const onLeave = useCallback(() => {
    setHoveredFund(null);
    setTipPos(null);
  }, []);

  return { hoveredFund, tipPos, tipRef, onEnter, onLeave };
}
