import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { FundMeta, FundHoldings } from "../types";
import { loadHoldings } from "../lib/data";
import { acColor, RiskTrack } from "./FundTooltipPopup";
import { HoldingsTreemap } from "./HoldingsTreemap";

function returnColor(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return "var(--text2)";
  return n >= 0 ? "#16a34a" : "#dc2626";
}

interface Props {
  fund: FundMeta;
  onClose: () => void;
}

export function FundDetailModal({ fund, onClose }: Props) {
  const [holdings, setHoldings] = useState<FundHoldings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadHoldings(fund.symbol)
      .then((h) => { setHoldings(h); setLoading(false); })
      .catch(() => setLoading(false));
  }, [fund.symbol]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const dotColor = acColor(fund.assetClass);
  const navDir = fund.nav.direction === "up";

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-popup" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close">{"\u00D7"}</button>

        <div className="modal-fund-header">
          <div className="modal-fund-info">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="modal-fund-symbol">{fund.symbol}</span>
              <span
                className="fund-card-class"
                style={{ background: dotColor + "22", color: dotColor, borderColor: dotColor + "55" }}
              >
                {fund.assetClass}
              </span>
            </div>
            <div className="modal-fund-name">{fund.name}</div>
          </div>
        </div>

        <div className="modal-stats-grid">
          <div className="modal-stat">
            <span className="modal-stat-lbl">NAV</span>
            <span className="modal-stat-val">
              {fund.nav.price}{" "}
              <span style={{ color: navDir ? "#16a34a" : "#dc2626", fontSize: 12 }}>
                {navDir ? "\u25B2" : "\u25BC"} {fund.nav.change} ({fund.nav.changePct})
              </span>
            </span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-lbl">Expense Ratio</span>
            <span className="modal-stat-val" style={{ color: "#16a34a" }}>{fund.expenseRatio}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-lbl">Risk Level</span>
            <span className="modal-stat-val"><RiskTrack level={fund.riskLevel ?? 0} /></span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-lbl">Yield</span>
            <span className="modal-stat-val">{fund.yield.pct} <span style={{ color: "var(--text2)", fontSize: 10 }}>({fund.yield.type})</span></span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-lbl">Min Investment</span>
            <span className="modal-stat-val">{fund.minInvestment}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-lbl">Inception</span>
            <span className="modal-stat-val">{fund.returns.inceptionDate}</span>
          </div>

          {/* Returns */}
          {(
            [
              ["YTD", fund.returns.ytd],
              ["1-Year", fund.returns.oneYear],
              ["5-Year", fund.returns.fiveYear],
              ["10-Year", fund.returns.tenYear],
              ["Since Inception", fund.returns.sinceInception],
            ] as [string, string][]
          ).map(([label, val]) => (
            <div key={label} className="modal-stat">
              <span className="modal-stat-lbl">{label} Return</span>
              <span className="modal-stat-val" style={{ color: returnColor(val) }}>{val}</span>
            </div>
          ))}
        </div>

        <div className="modal-treemap-section">
          <h3 className="modal-treemap-title">
            Holdings Breakdown
            {holdings && !loading && (
              <span style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>
                {holdings.holdingsCount.total.toLocaleString()} holdings
                ({holdings.holdingsCount.stock.toLocaleString()} stocks, {holdings.holdingsCount.bond.toLocaleString()} bonds)
              </span>
            )}
          </h3>
          {loading ? (
            <div className="spinner-wrap"><span className="spinner" /></div>
          ) : holdings && holdings.holdingsCount.total > 0 ? (
            <HoldingsTreemap holdings={holdings} />
          ) : (
            <div className="detail-empty">
              No individual holdings data available (fund-of-funds).
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
