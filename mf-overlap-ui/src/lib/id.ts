import type { RawHolding, ResolvedHolding } from "../types";

/**
 * Resolve a stable, cross-fund identifier for a holding.
 * ISIN is preferred (globally unique). Falls back to CUSIP, then
 * ticker+name concatenation. This handles cases where bonds share
 * tickers but differ by ISIN/CUSIP.
 */
export function resolveId(h: RawHolding): string {
  if (h.isin) return `isin:${h.isin}`;
  if (h.cusip) return `cusip:${h.cusip}`;
  const t = h.ticker ?? "";
  return `name:${t}|${h.name}`;
}

export function resolveHolding(h: RawHolding): ResolvedHolding {
  return {
    id: resolveId(h),
    type: h.type,
    ticker: h.ticker,
    isin: h.isin,
    name: h.name,
    weight: parseFloat(h.percentWeight) || 0,
    marketValue: h.marketValue,
    couponRate: h.couponRate,
    maturityDate: h.maturityDate,
  };
}
