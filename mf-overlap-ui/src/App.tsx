import { useEffect, useMemo, useState, useCallback } from "react";
import type { FundHoldings, FundMeta, HoldingFilter } from "./types";
import { isFundOfFunds, loadFundList, loadHoldings } from "./lib/data";
import { computeMatrix, pairKey } from "./lib/overlap";
import { FundPicker } from "./components/FundPicker";
import { ChordDiagram } from "./components/ChordDiagram";
import { DetailPanel } from "./components/HoldingsTables";

type LoadState = "idle" | "loading" | "error";

export default function App() {
  const [allFunds, setAllFunds] = useState<FundMeta[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [holdingsMap, setHoldingsMap] = useState<Map<string, FundHoldings>>(new Map());
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const [fofSymbols, setFofSymbols] = useState<Set<string>>(new Set());

  const [filter, setFilter] = useState<HoldingFilter>("all");
  const [activePair, setActivePair] = useState<[string, string] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);

  // Load fund list once
  useEffect(() => {
    setLoadState("loading");
    loadFundList()
      .then((funds) => { setAllFunds(funds); setLoadState("idle"); })
      .catch((e) => { setError(String(e)); setLoadState("error"); });
  }, []);

  // Load holdings whenever selection changes
  useEffect(() => {
    for (const sym of selected) {
      if (holdingsMap.has(sym) || loadingSymbols.has(sym)) continue;
      setLoadingSymbols((prev) => new Set([...prev, sym]));
      loadHoldings(sym)
        .then((h) => {
          if (isFundOfFunds(h)) setFofSymbols((prev) => new Set([...prev, sym]));
          setHoldingsMap((prev) => new Map([...prev, [sym, h]]));
          setLoadingSymbols((prev) => { const n = new Set(prev); n.delete(sym); return n; });
        })
        .catch(() => {
          setLoadingSymbols((prev) => { const n = new Set(prev); n.delete(sym); return n; });
        });
    }
  }, [selected, holdingsMap, loadingSymbols]);

  const handleToggle = (symbol: string) => {
    setSelected((prev) => {
      if (prev.includes(symbol)) {
        const next = prev.filter((s) => s !== symbol);
        // Clear active pair if it involved this fund
        setActivePair((ap) =>
          ap && (ap[0] === symbol || ap[1] === symbol) ? null : ap
        );
        return next;
      }
      if (prev.length >= 10) return prev;
      return [...prev, symbol];
    });
  };

  const selectedHoldings = useMemo(
    () => selected.flatMap((s) => (holdingsMap.has(s) ? [holdingsMap.get(s)!] : [])),
    [selected, holdingsMap]
  );

  // Exclude fund-of-funds from matrix
  const validHoldings = useMemo(
    () => selectedHoldings.filter((h) => !isFundOfFunds(h)),
    [selectedHoldings]
  );

  const matrix = useMemo(
    () => computeMatrix(validHoldings, filter),
    [validHoldings, filter]
  );

  const fundMetaMap = useMemo(
    () => new Map(allFunds.map((f) => [f.symbol, f])),
    [allFunds]
  );

  const handleSelectPair = (a: string, b: string) => {
    const key = pairKey(a, b);
    const [sa, sb] = key.split("|");
    setActivePair((prev) =>
      prev && pairKey(prev[0], prev[1]) === key ? null : [sa, sb]
    );
  };

  const isLoading = loadingSymbols.size > 0;
  const pendingSymbols = selected.filter((s) => !holdingsMap.has(s));

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? "" : " sidebar--collapsed"}`}>
        {/* Toggle tab */}
        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={sidebarOpen ? "Collapse panel" : "Expand panel"}
          aria-label={sidebarOpen ? "Collapse panel" : "Expand panel"}
        >
          {sidebarOpen ? "◀" : "▶"}
        </button>

        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <span className="logo-mark">V</span>
            <span className="logo-text">Fund Overlap</span>
          </div>
          {loadState === "error" && (
            <div className="error-banner">Failed to load funds: {error}</div>
          )}
          {loadState === "loading" ? (
            <div className="spinner-wrap"><span className="spinner" /></div>
          ) : (
            <FundPicker
              funds={allFunds}
              selected={selected}
              onToggle={handleToggle}
            />
          )}

          {/* Filter */}
          {selected.length >= 2 && (
            <div className="filter-group">
              <span className="filter-label">Holdings type</span>
              <div className="toggle-group">
                {(["all", "stock", "bond"] as HoldingFilter[]).map((f) => (
                  <button
                    key={f}
                    className={filter === f ? "toggle-btn toggle-btn--active" : "toggle-btn"}
                    onClick={() => { setFilter(f); setActivePair(null); }}
                  >
                    {f === "all" ? "All" : f === "stock" ? "Stocks" : "Bonds"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="selected-chips">
              {selected.map((s) => (
                <span key={s} className="chip">
                  {s}
                  {fofSymbols.has(s) && <span className="chip-fof" title="Fund-of-funds">⚠</span>}
                  {loadingSymbols.has(s) && <span className="chip-loading">…</span>}
                  <button className="chip-remove" onClick={() => handleToggle(s)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <header className="main-header">
          <h1 className="main-title">Vanguard Mutual Fund Overlap Explorer</h1>
          <p className="main-sub">Compare holdings overlap across up to 10 funds simultaneously.</p>
        </header>

        {selected.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h2>Pick 2–10 funds to compare</h2>
            <p>Use the panel on the left to search and select mutual funds.</p>
          </div>
        )}

        {/* Loading indicators */}
        {isLoading && pendingSymbols.length > 0 && (
          <div className="loading-banner">
            <span className="spinner" />
            Loading holdings for {pendingSymbols.join(", ")}…
          </div>
        )}

        {/* Fund-of-funds warnings */}
        {fofSymbols.size > 0 && [...fofSymbols].some((s) => selected.includes(s)) && (
          <div className="info-banner">
            <strong>Note:</strong>{" "}
            {[...fofSymbols].filter((s) => selected.includes(s)).join(", ")} are fund-of-funds (LifeStrategy)
            and hold other funds rather than individual securities. They are excluded from overlap calculations.
          </div>
        )}

        {/* Chord diagram */}
        {validHoldings.length >= 2 && !isLoading && (
          <>
            <ChordDiagram
              funds={validHoldings}
              matrix={matrix}
              filter={filter}
              activePair={activePair}
              onSelectPair={handleSelectPair}
              fundMeta={fundMetaMap}
            />

            {/* Pair toggle hint for 3-4 funds */}
            {validHoldings.length >= 3 && (
              <div className="view-toggle-row">
                <button
                  className={activePair === null ? "toggle-btn toggle-btn--active" : "toggle-btn"}
                  onClick={() => setActivePair(null)}
                >
                  Intersection ({validHoldings.length} funds)
                </button>
                {activePair && (
                  <span className="active-pair-label">
                    Viewing: {activePair[0]} vs {activePair[1]}
                  </span>
                )}
              </div>
            )}

            <DetailPanel
              selectedFunds={validHoldings}
              activePair={activePair}
              filter={filter}
              fundMeta={fundMetaMap}
            />
          </>
        )}
      </main>
    </div>
  );
}
