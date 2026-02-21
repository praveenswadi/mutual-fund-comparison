import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type {
  FundHoldings,
  FundMeta,
  HoldingFilter,
  IntersectionHolding,
  PairOverlap,
} from "../types";
import { computeIntersection, computePairOverlap } from "../lib/overlap";
import { weightColor, overlapColor } from "../lib/colors";

const PAGE = 25;

interface PairDetailProps {
  pair: PairOverlap;
  filter: HoldingFilter;
  metaA: FundMeta | undefined;
  metaB: FundMeta | undefined;
}

function HoldingBadge({ type }: { type: "stock" | "bond" }) {
  return (
    <span className={`badge badge--${type}`}>{type}</span>
  );
}

function weightLabel(pct: number): string {
  if (pct >= 10) return "major position — dominates the fund";
  if (pct >= 5)  return "significant position";
  if (pct >= 1)  return "moderate position";
  if (pct >= 0.1) return "minor position";
  return "negligible position";
}

const LEGEND: Array<{ label: string; samplePct: number }> = [
  { label: "small position",    samplePct: 0.3 },
  { label: "moderate position", samplePct: 4   },
  { label: "large position",    samplePct: 12  },
];

interface TooltipPos { x: number; y: number }

function WeightBar({ pct, max }: { pct: number; max: number }) {
  const width = max > 0 ? (pct / max) * 100 : 0;
  const color = weightColor(pct);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<TooltipPos | null>(null);

  const show = useCallback(() => {
    if (wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
  }, []);

  return (
    <>
      <span ref={wrapRef} className="weight-bar-wrap" onMouseEnter={show} onMouseLeave={() => setPos(null)}>
        <span className="weight-bar" style={{ width: `${width}%`, background: color }} />
        <span className="weight-val" style={{ color }}>{pct.toFixed(2)}%</span>
      </span>
      {pos && createPortal(
        <span className="weight-tooltip" style={{ left: pos.x, top: pos.y }}>
          <span className="wt-header">{pct.toFixed(2)}% — {weightLabel(pct)}</span>
          <span className="wt-divider" />
          {LEGEND.map(({ label, samplePct }) => (
            <span key={label} className="wt-legend-row">
              <span className="wt-swatch" style={{ background: weightColor(samplePct) }} />
              {label}
            </span>
          ))}
        </span>,
        document.body
      )}
    </>
  );
}

export function PairDetail({ pair, metaA, metaB, filter: _filter }: PairDetailProps) {
  const [sharedPage, setSharedPage] = useState(0);
  const [showUnique, setShowUnique] = useState<"A" | "B">("A");

  const shared = pair.sharedHoldings;
  const sharedSlice = shared.slice(sharedPage * PAGE, (sharedPage + 1) * PAGE);
  const sharedPages = Math.ceil(shared.length / PAGE);
  const maxSharedW = shared[0]?.minWeight ?? 0;

  const uniqueList = showUnique === "A" ? pair.uniqueA : pair.uniqueB;
  const uniqueSymbol = showUnique === "A" ? pair.symbolA : pair.symbolB;
  const maxUniqueW = uniqueList[0]?.weight ?? 0;

  const nameA = metaA?.name?.replace(" Admiral Shares", "") ?? pair.symbolA;
  const nameB = metaB?.name?.replace(" Admiral Shares", "") ?? pair.symbolB;

  return (
    <div className="detail-wrap">
      {/* Summary bar */}
      <div className="detail-summary">
        <div className="detail-fund detail-fund--a">
          <span className="detail-symbol">{pair.symbolA}</span>
          <span className="detail-fname">{nameA}</span>
          <span className="detail-stat">{pair.totalA} holdings</span>
        </div>
        <div className="detail-center">
          <div className="detail-overlap-pct" style={{ color: overlapColor(pair.weightOverlap) }}>{pair.weightOverlap.toFixed(1)}%</div>
          <div className="detail-overlap-label">weight overlap</div>
          <div className="detail-shared-count">{pair.sharedCount} shared holdings</div>
        </div>
        <div className="detail-fund detail-fund--b">
          <span className="detail-symbol">{pair.symbolB}</span>
          <span className="detail-fname">{nameB}</span>
          <span className="detail-stat">{pair.totalB} holdings</span>
        </div>
      </div>

      {/* Shared holdings table */}
      <h3 className="detail-section-title">
        Shared Holdings ({shared.length})
      </h3>
      {shared.length === 0 ? (
        <p className="detail-empty">No shared holdings for the selected filter.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Ticker</th>
                  <th>Type</th>
                  <th title="Hover any bar for details">{pair.symbolA} weight</th>
                  <th title="Hover any bar for details">{pair.symbolB} weight</th>
                </tr>
              </thead>
              <tbody>
                {sharedSlice.map((h, i) => (
                  <tr key={h.id}>
                    <td className="td-num">{sharedPage * PAGE + i + 1}</td>
                    <td className="td-name">{h.name}</td>
                    <td className="td-ticker">{h.ticker ?? "—"}</td>
                    <td><HoldingBadge type={h.type} /></td>
                    <td><WeightBar pct={h.weightA} max={maxSharedW} /></td>
                    <td><WeightBar pct={h.weightB} max={maxSharedW} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sharedPages > 1 && (
            <div className="pagination">
              <button disabled={sharedPage === 0} onClick={() => setSharedPage((p) => p - 1)}>← Prev</button>
              <span>Page {sharedPage + 1} / {sharedPages}</span>
              <button disabled={sharedPage >= sharedPages - 1} onClick={() => setSharedPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Unique holdings toggle */}
      <div className="detail-unique-header">
        <h3 className="detail-section-title">Unique Holdings</h3>
        <div className="toggle-group">
          <button
            className={showUnique === "A" ? "toggle-btn toggle-btn--active" : "toggle-btn"}
            onClick={() => setShowUnique("A")}
          >
            {pair.symbolA} only ({pair.uniqueA.length})
          </button>
          <button
            className={showUnique === "B" ? "toggle-btn toggle-btn--active" : "toggle-btn"}
            onClick={() => setShowUnique("B")}
          >
            {pair.symbolB} only ({pair.uniqueB.length})
          </button>
        </div>
      </div>
      {uniqueList.length === 0 ? (
        <p className="detail-empty">No unique holdings for {uniqueSymbol}.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Ticker</th>
                <th>Type</th>
                <th>{uniqueSymbol} weight</th>
              </tr>
            </thead>
            <tbody>
              {uniqueList.slice(0, PAGE).map((h, i) => (
                <tr key={h.id}>
                  <td className="td-num">{i + 1}</td>
                  <td className="td-name">{h.name}</td>
                  <td className="td-ticker">{h.ticker ?? "—"}</td>
                  <td><HoldingBadge type={h.type} /></td>
                  <td><WeightBar pct={h.weight} max={maxUniqueW} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface IntersectionProps {
  funds: FundHoldings[];
  filter: HoldingFilter;
}

export function IntersectionView({ funds, filter }: IntersectionProps) {
  const [page, setPage] = useState(0);
  const items: IntersectionHolding[] = computeIntersection(funds, filter);
  const slice = items.slice(page * PAGE, (page + 1) * PAGE);
  const pages = Math.ceil(items.length / PAGE);
  const symbols = funds.map((f) => f.symbol);
  const maxW = items[0]?.minWeight ?? 0;

  return (
    <div className="detail-wrap">
      <div className="intersection-header">
        <h3 className="detail-section-title">
          Common to all {funds.length} funds ({items.length} holdings)
        </h3>
        <p className="intersection-sub">
          Sorted by smallest weight across {symbols.join(", ")} — hover any bar for details
        </p>
      </div>
      {items.length === 0 ? (
        <p className="detail-empty">No holdings are common to all selected funds with this filter.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Ticker</th>
                  <th>Type</th>
                  {symbols.map((s) => <th key={s} title="Hover any bar for details">{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {slice.map((h, i) => (
                  <tr key={h.id}>
                    <td className="td-num">{page * PAGE + i + 1}</td>
                    <td className="td-name">{h.name}</td>
                    <td className="td-ticker">{h.ticker ?? "—"}</td>
                    <td><HoldingBadge type={h.type} /></td>
                    {symbols.map((s) => (
                      <td key={s}><WeightBar pct={h.weights[s] ?? 0} max={maxW} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="pagination">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span>Page {page + 1} / {pages}</span>
              <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface DetailPanelProps {
  selectedFunds: FundHoldings[];
  activePair: [string, string] | null;
  filter: HoldingFilter;
  fundMeta: Map<string, FundMeta>;
}

export function DetailPanel({ selectedFunds, activePair, filter, fundMeta }: DetailPanelProps) {
  if (selectedFunds.length < 2) return null;

  if (selectedFunds.length >= 3 && !activePair) {
    return (
      <IntersectionView funds={selectedFunds} filter={filter} />
    );
  }

  if (!activePair) return null;

  const a = selectedFunds.find((f) => f.symbol === activePair[0]);
  const b = selectedFunds.find((f) => f.symbol === activePair[1]);
  if (!a || !b) return null;

  const pair = computePairOverlap(a, b, filter);

  return (
    <PairDetail
      pair={pair}
      filter={filter}
      metaA={fundMeta.get(a.symbol)}
      metaB={fundMeta.get(b.symbol)}
    />
  );
}
