import clsx from "clsx";
import type { FundHoldings, PairOverlap } from "../types";
import { pairKey } from "../lib/overlap";
import { isFundOfFunds } from "../lib/data";
import { overlapColor } from "../lib/colors";

interface Props {
  funds: FundHoldings[];
  matrix: Map<string, PairOverlap>;
  activePair: [string, string] | null;
  onSelectPair: (a: string, b: string) => void;
}

export function OverlapMatrix({ funds, matrix, activePair, onSelectPair }: Props) {
  if (funds.length < 2) {
    return (
      <div className="matrix-placeholder">
        <p>Select at least 2 funds to see overlap.</p>
      </div>
    );
  }

  const symbols = funds.map((f) => f.symbol);

  return (
    <div className="matrix-wrap">
      <h2 className="section-title">Overlap Matrix <span className="section-subtitle">(weight overlap %)</span></h2>
      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="matrix-corner" />
              {symbols.map((s) => (
                <th key={s} className="matrix-col-head">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((rowSym, ri) => (
              <tr key={rowSym}>
                <th className="matrix-row-head">{rowSym}</th>
                {symbols.map((colSym, ci) => {
                  if (ri === ci) {
                    const fof = isFundOfFunds(funds[ri]);
                    return (
                      <td key={colSym} className="matrix-cell matrix-cell--self">
                        {fof ? <span title="Fund-of-funds">—</span> : "100%"}
                      </td>
                    );
                  }
                  const key = pairKey(rowSym, colSym);
                  const pair = matrix.get(key);
                  if (!pair) return <td key={colSym} className="matrix-cell">—</td>;

                  const pct = pair.weightOverlap;
                  const isActive =
                    activePair !== null &&
                    ((activePair[0] === rowSym && activePair[1] === colSym) ||
                      (activePair[0] === colSym && activePair[1] === rowSym));

                  return (
                    <td
                      key={colSym}
                      role="button"
                      tabIndex={0}
                      className={clsx("matrix-cell", "matrix-cell--pair", {
                        "matrix-cell--active": isActive,
                      })}
                      style={{
                        background: overlapColor(pct),
                        color: "#f8fafc",
                      }}
                      onClick={() => onSelectPair(rowSym, colSym)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectPair(rowSym, colSym)}
                      aria-label={`${rowSym} vs ${colSym}: ${pct.toFixed(1)}% weight overlap, ${pair.sharedCount} shared holdings`}
                      title={`${rowSym} vs ${colSym}: ${pct.toFixed(1)}% weight overlap, ${pair.sharedCount} shared holdings`}
                    >
                      {pct.toFixed(1)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="matrix-hint">Click a cell to explore pair details below.</p>
    </div>
  );
}
