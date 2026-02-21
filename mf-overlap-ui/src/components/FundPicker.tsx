import { useState, useMemo } from "react";
import clsx from "clsx";
import type { FundMeta } from "../types";
import {
  acColor,
  FundTooltipPortal,
  useHoverFundTip,
} from "./FundTooltipPopup";

interface Props {
  funds:    FundMeta[];
  selected: string[];
  onToggle: (symbol: string) => void;
}

const MAX_SELECTED = 10;

export function FundPicker({ funds, selected, onToggle }: Props) {
  const [query, setQuery] = useState("");
  const { hoveredFund, tipPos, onEnter, onLeave } = useHoverFundTip(/* containerRef */ undefined);

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
              onMouseEnter={(e) => onEnter(e, f)}
              onMouseLeave={onLeave}
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

      <FundTooltipPortal fund={hoveredFund} pos={tipPos} />
    </div>
  );
}
