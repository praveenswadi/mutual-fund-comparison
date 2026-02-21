import { useEffect, useMemo, useState } from "react";
import type { FundMeta } from "../types";
import { loadFundList } from "../lib/data";
import { ASSET_CLASS_COLORS, acColor, RiskTrack } from "./FundTooltipPopup";
import { FundDetailModal } from "./FundDetailModal";

type LoadState = "idle" | "loading" | "error";

const CATEGORY_ORDER = Object.keys(ASSET_CLASS_COLORS);

function categorySort(a: string, b: string): number {
  const ai = CATEGORY_ORDER.findIndex((k) => a.toLowerCase().includes(k.toLowerCase().split(" - ")[1] ?? ""));
  const bi = CATEGORY_ORDER.findIndex((k) => b.toLowerCase().includes(k.toLowerCase().split(" - ")[1] ?? ""));
  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
}

function returnColor(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return "var(--text2)";
  return n >= 0 ? "#16a34a" : "#dc2626";
}

export default function FundCardsPage() {
  const [allFunds, setAllFunds] = useState<FundMeta[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedFund, setSelectedFund] = useState<FundMeta | null>(null);

  useEffect(() => {
    setLoadState("loading");
    loadFundList()
      .then((funds) => { setAllFunds(funds); setLoadState("idle"); })
      .catch((e) => { setError(String(e)); setLoadState("error"); });
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, FundMeta[]>();
    for (const f of allFunds) {
      const list = map.get(f.assetClass) ?? [];
      list.push(f);
      map.set(f.assetClass, list);
    }
    return [...map.entries()].sort(([a], [b]) => categorySort(a, b));
  }, [allFunds]);

  if (loadState === "error") {
    return (
      <div className="cards-page">
        <div className="error-banner">Failed to load funds: {error}</div>
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="cards-page">
        <div className="spinner-wrap"><span className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="cards-page">
      <header className="cards-page-header">
        <div className="cards-page-header-text">
          <h1 className="main-title">Vanguard Mutual Funds</h1>
          <p className="main-sub">{allFunds.length} funds across {grouped.length} categories. Click any card for details.</p>
        </div>
      </header>

      {grouped.map(([category, funds]) => {
        const color = acColor(category);
        return (
          <section key={category} className="cards-category">
            <h2 className="cards-category-title">
              <span className="cards-category-dot" style={{ background: color }} />
              {category}
              <span className="picker-badge">{funds.length}</span>
            </h2>
            <div className="cards-grid">
              {funds.map((fund) => (
                <FundCard key={fund.symbol} fund={fund} onClick={() => setSelectedFund(fund)} />
              ))}
            </div>
          </section>
        );
      })}

      {selectedFund && (
        <FundDetailModal fund={selectedFund} onClose={() => setSelectedFund(null)} />
      )}
    </div>
  );
}

function FundCard({ fund, onClick }: { fund: FundMeta; onClick: () => void }) {
  const dotColor = acColor(fund.assetClass);
  const navDir = fund.nav.direction === "up";

  return (
    <div className="fund-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}>
      <div className="fund-card-header">
        <span className="fund-card-dot" style={{ background: dotColor }} />
        <span className="fund-card-symbol">{fund.symbol}</span>
      </div>
      <div className="fund-card-name">{fund.name.replace(" Admiral Shares", "")}</div>
      <span
        className="fund-card-class"
        style={{ background: dotColor + "22", color: dotColor, borderColor: dotColor + "55" }}
      >
        {fund.assetClass}
      </span>

      <div className="fund-card-stats">
        <div className="fund-card-stat">
          <span className="fund-card-stat-lbl">Expense</span>
          <span className="fund-card-stat-val" style={{ color: "#16a34a" }}>{fund.expenseRatio}</span>
        </div>
        <div className="fund-card-stat">
          <span className="fund-card-stat-lbl">Yield</span>
          <span className="fund-card-stat-val">{fund.yield.pct}</span>
        </div>
        <div className="fund-card-stat">
          <span className="fund-card-stat-lbl">Risk</span>
          <span className="fund-card-stat-val"><RiskTrack level={fund.riskLevel ?? 0} /></span>
        </div>
        <div className="fund-card-stat">
          <span className="fund-card-stat-lbl">YTD</span>
          <span className="fund-card-stat-val" style={{ color: returnColor(fund.returns.ytd) }}>{fund.returns.ytd}</span>
        </div>
      </div>

      <div className="fund-card-nav">
        <span>{fund.nav.price}</span>
        <span style={{ color: navDir ? "#16a34a" : "#dc2626", fontSize: 12 }}>
          {navDir ? "\u25B2" : "\u25BC"} {fund.nav.change}
        </span>
      </div>
    </div>
  );
}
