import { useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import * as d3 from "d3";
import type { ChordGroup, Chord } from "d3";
import type { FundHoldings, FundMeta, HoldingFilter, PairOverlap } from "../types";
import { pairKey } from "../lib/overlap";
import { overlapColor } from "../lib/colors";

// ── Layout constants ────────────────────────────────────────────
const SIZE      = 500;
const CX        = SIZE / 2;
const CY        = SIZE / 2;
const OUTER_R   = 175;
const INNER_R   = 156;
const LABEL_R   = OUTER_R + 20;
const TICK_R    = OUTER_R + 6;

// One distinct color per fund arc position
const FUND_COLORS = [
  "#818cf8", // indigo
  "#60a5fa", // blue
  "#34d399", // emerald
  "#a78bfa", // violet
  "#f472b6", // pink
  "#fb923c", // orange
  "#4ade80", // green
  "#38bdf8", // sky
  "#e879f9", // fuchsia
  "#fbbf24", // amber
];

// ── Helper: arc midpoint in Cartesian ──────────────────────────
function midAngle(g: ChordGroup) {
  return (g.startAngle + g.endAngle) / 2 - Math.PI / 2;
}

// ── Component ──────────────────────────────────────────────────
interface Props {
  funds:        FundHoldings[];
  matrix:       Map<string, PairOverlap>;
  filter:       HoldingFilter;
  activePair:   [string, string] | null;
  onSelectPair: (a: string, b: string) => void;
  fundMeta:     Map<string, FundMeta>;
}

export function ChordDiagram({
  funds,
  matrix,
  activePair,
  onSelectPair,
  fundMeta,
}: Props) {
  const [hoveredGroup, setHoveredGroup]   = useState<number | null>(null);
  const [hoveredChord, setHoveredChord]   = useState<string | null>(null);
  const tooltipRef                        = useRef<HTMLDivElement | null>(null);
  const [tooltipContent, setTooltipContent] = useState<React.ReactNode>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const symbols = useMemo(() => funds.map((f) => f.symbol), [funds]);
  const n       = symbols.length;

  // ── NxN overlap matrix for d3.chord() ─────────────────────────
  // Use max(coverageAbyB, coverageBbyA) so chord thickness reflects the
  // strongest directional overlap (e.g. "VIGAX is 100% contained in VLCAX")
  // and correctly handles truncated data where raw weightOverlap < actual overlap.
  const dataMatrix = useMemo<number[][]>(() => {
    const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const pair = matrix.get(pairKey(symbols[i], symbols[j]));
        if (pair) m[i][j] = Math.max(pair.coverageAbyB, pair.coverageBbyA);
      }
    }
    return m;
  }, [n, symbols, matrix]);

  // ── d3 chord layout ───────────────────────────────────────────
  const chords = useMemo(() => {
    return d3.chord()
      .padAngle(n <= 4 ? 0.06 : 0.04)
      .sortSubgroups(d3.descending)(dataMatrix);
  }, [dataMatrix, n]);

  // ── SVG path generators ───────────────────────────────────────
  const drawArc = useCallback(
    (g: ChordGroup) =>
      d3.arc()({
        innerRadius: INNER_R,
        outerRadius: OUTER_R,
        startAngle: g.startAngle,
        endAngle:   g.endAngle,
      }) ?? "",
    []
  );

  const drawRibbon = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: Chord) => d3.ribbon().radius(INNER_R)(c as any) ?? "",
    []
  );

  // ── Opacity logic ─────────────────────────────────────────────
  const chordOpacity = useCallback(
    (c: Chord) => {
      const i   = c.source.index;
      const j   = c.target.index;
      const key = `${Math.min(i, j)}|${Math.max(i, j)}`;
      const isActive =
        activePair !== null &&
        ((activePair[0] === symbols[i] && activePair[1] === symbols[j]) ||
         (activePair[0] === symbols[j] && activePair[1] === symbols[i]));

      if (hoveredChord === key)    return 0.92;
      if (hoveredChord !== null)   return 0.06;
      if (hoveredGroup === i || hoveredGroup === j) return 0.85;
      if (hoveredGroup !== null)   return 0.08;
      return isActive ? 0.88 : 0.62;
    },
    [hoveredChord, hoveredGroup, activePair, symbols]
  );

  // ── Position tooltip via ref (avoids re-render on mousemove) ──
  const positionTooltip = useCallback((clientX: number, clientY: number) => {
    if (!tooltipRef.current) return;
    const t = tooltipRef.current;
    const { innerWidth, innerHeight } = window;
    const tw = t.offsetWidth  || 200;
    const th = t.offsetHeight || 120;
    let x = clientX + 16;
    let y = clientY - 12;
    if (x + tw > innerWidth  - 8) x = clientX - tw - 16;
    if (y + th > innerHeight - 8) y = clientY - th - 12;
    t.style.left = `${x}px`;
    t.style.top  = `${y}px`;
  }, []);

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => positionTooltip(e.clientX, e.clientY),
    [positionTooltip]
  );

  // ── Hover: arc ────────────────────────────────────────────────
  const handleArcEnter = useCallback(
    (e: React.MouseEvent, gi: number) => {
      setHoveredGroup(gi);
      setHoveredChord(null);

      const sym  = symbols[gi];
      const meta = fundMeta.get(sym);
      const name = meta?.name.replace(" Admiral Shares", "") ?? sym;

      // For arc tooltip: show "% of THIS fund covered by each other fund"
      const overlaps: Array<{ sym: string; covThisByOther: number; covOtherByThis: number; count: number }> = [];
      for (let j = 0; j < n; j++) {
        if (j === gi) continue;
        const pair = matrix.get(pairKey(sym, symbols[j]));
        if (!pair) continue;
        // Determine which direction is "this fund covered by other"
        const covThisByOther = pair.symbolA === sym ? pair.coverageAbyB : pair.coverageBbyA;
        const covOtherByThis = pair.symbolA === sym ? pair.coverageBbyA : pair.coverageAbyB;
        if (Math.max(covThisByOther, covOtherByThis) > 0)
          overlaps.push({ sym: symbols[j], covThisByOther, covOtherByThis, count: pair.sharedCount });
      }
      overlaps.sort((a, b) => b.covThisByOther - a.covThisByOther);

      setTooltipContent(
        <>
          <div className="chord-tt-title">{sym}</div>
          <div className="chord-tt-sub">{name}</div>
          {overlaps.length > 0 && (
            <>
              <div className="chord-tt-divider" />
              <div className="chord-tt-total">{sym} coverage by other funds:</div>
              {overlaps.map((o) => {
                const displayPct = Math.max(o.covThisByOther, o.covOtherByThis);
                return (
                  <div key={o.sym} className="chord-tt-row">
                    <span className="chord-tt-swatch" style={{ background: overlapColor(displayPct) }} />
                    <span style={{ color: overlapColor(displayPct), fontWeight: 600 }}>{o.covThisByOther.toFixed(1)}%</span>
                    <span className="chord-tt-vs">{sym}∈{o.sym}</span>
                    <span className="chord-tt-muted">· {o.count} shared</span>
                  </div>
                );
              })}
            </>
          )}
          {overlaps.length === 0 && (
            <>
              <div className="chord-tt-divider" />
              <div className="chord-tt-muted">No overlap with current selection</div>
            </>
          )}
        </>
      );
      setTooltipVisible(true);
      positionTooltip(e.clientX, e.clientY);
    },
    [symbols, fundMeta, matrix, n, positionTooltip]
  );

  // ── Hover: chord ──────────────────────────────────────────────
  const handleChordEnter = useCallback(
    (e: React.MouseEvent, c: Chord) => {
      const i   = c.source.index;
      const j   = c.target.index;
      const key = `${Math.min(i, j)}|${Math.max(i, j)}`;
      setHoveredChord(key);
      setHoveredGroup(null);

      const symA = symbols[i];
      const symB = symbols[j];
      const pair = matrix.get(pairKey(symA, symB));

      const maxCov = pair ? Math.max(pair.coverageAbyB, pair.coverageBbyA) : 0;
      setTooltipContent(
        pair ? (
          <>
            <div className="chord-tt-title">{symA} ↔ {symB}</div>
            <div className="chord-tt-divider" />
            <div
              className="chord-tt-overlap"
              style={{ color: overlapColor(maxCov) }}
            >
              {pair.coverageAbyB.toFixed(1)}% of {symA} in {symB}
            </div>
            <div
              className="chord-tt-overlap"
              style={{ color: overlapColor(maxCov) }}
            >
              {pair.coverageBbyA.toFixed(1)}% of {symB} in {symA}
            </div>
            <div className="chord-tt-count">{pair.sharedCount} shared holdings</div>
            <div className="chord-tt-hint">Click to explore →</div>
          </>
        ) : null
      );
      setTooltipVisible(true);
      positionTooltip(e.clientX, e.clientY);
    },
    [symbols, matrix, positionTooltip]
  );

  const handleLeave = useCallback(() => {
    setHoveredGroup(null);
    setHoveredChord(null);
    setTooltipVisible(false);
  }, []);

  if (n < 2) return null;

  return (
    <div className="chord-wrap">
      <h2 className="section-title">
        Overlap Diagram <span className="section-subtitle">(directional coverage %)</span>
      </h2>

      <div className="chord-svg-container">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="chord-svg"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleLeave}
        >
          <g transform={`translate(${CX},${CY})`}>

            {/* ── Ribbons (chords) ─────────────────────── */}
            {Array.from(chords).map((c, ci) => {
              const i    = c.source.index;
              const j    = c.target.index;
              const pair = matrix.get(pairKey(symbols[i], symbols[j]));
              if (!pair) return null;
              const col = overlapColor(Math.max(pair.coverageAbyB, pair.coverageBbyA));
              return (
                <path
                  key={`ribbon-${ci}`}
                  d={drawRibbon(c)}
                  fill={col}
                  stroke={col}
                  strokeWidth={0.5}
                  opacity={chordOpacity(c)}
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => handleChordEnter(e, c)}
                  onClick={() => onSelectPair(symbols[i], symbols[j])}
                />
              );
            })}

            {/* ── Arc groups ───────────────────────────── */}
            {chords.groups.map((g, gi) => {
              const color     = FUND_COLORS[gi % FUND_COLORS.length];
              const isHovered = hoveredGroup === gi;
              const isFaded   = hoveredGroup !== null && !isHovered;
              const angle     = midAngle(g);
              const lx        = LABEL_R * Math.cos(angle);
              const ly        = LABEL_R * Math.sin(angle);
              const anchor    = Math.cos(angle) > 0 ? "start" : "end";
              // tick line from arc edge to label
              const tx0       = TICK_R * Math.cos(angle);
              const ty0       = TICK_R * Math.sin(angle);
              const tx1       = (LABEL_R - 4) * Math.cos(angle);
              const ty1       = (LABEL_R - 4) * Math.sin(angle);

              return (
                <g key={`group-${gi}`}>
                  <path
                    d={drawArc(g)}
                    fill={color}
                    stroke={color}
                    strokeWidth={1}
                    opacity={isFaded ? 0.25 : isHovered ? 1.0 : 0.85}
                    style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                    onMouseEnter={(e) => handleArcEnter(e, gi)}
                  />
                  {/* tick line */}
                  <line
                    x1={tx0} y1={ty0}
                    x2={tx1} y2={ty1}
                    stroke={color}
                    strokeWidth={1}
                    opacity={isFaded ? 0.2 : 0.6}
                    style={{ pointerEvents: "none" }}
                  />
                  {/* label */}
                  <text
                    x={lx}
                    y={ly}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    fill={isFaded ? "#374151" : isHovered ? "#f8fafc" : "#cbd5e1"}
                    fontSize={n > 7 ? 10 : 11}
                    fontWeight={isHovered ? 700 : 500}
                    style={{
                      pointerEvents: "none",
                      transition: "fill 0.15s",
                      userSelect: "none",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {symbols[gi]}
                  </text>
                </g>
              );
            })}

          </g>
        </svg>
      </div>

      <p className="matrix-hint">Hover arc or chord for details · Click chord to explore pair below</p>

      {createPortal(
        <div
          ref={tooltipRef}
          className="chord-tooltip"
          style={{
            opacity: tooltipVisible ? 1 : 0,
            pointerEvents: "none",
          }}
        >
          {tooltipContent}
        </div>,
        document.body
      )}
    </div>
  );
}
