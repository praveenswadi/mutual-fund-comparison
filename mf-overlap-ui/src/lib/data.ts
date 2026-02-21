import type { FundHoldings, FundMeta } from "../types";

const holdingsCache = new Map<string, FundHoldings>();

export async function loadFundList(): Promise<FundMeta[]> {
  const res = await fetch("/mutual-funds.json");
  if (!res.ok) throw new Error("Failed to load mutual-funds.json");
  const data = await res.json();
  return data.funds as FundMeta[];
}

export async function loadHoldings(symbol: string): Promise<FundHoldings> {
  const key = symbol.toLowerCase();
  if (holdingsCache.has(key)) return holdingsCache.get(key)!;

  const res = await fetch(`/holdings/${key}.json`);
  if (!res.ok) throw new Error(`Failed to load holdings for ${symbol}`);
  const data: FundHoldings = await res.json();
  holdingsCache.set(key, data);
  return data;
}

export async function loadManyHoldings(
  symbols: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, FundHoldings>> {
  const result = new Map<string, FundHoldings>();
  let done = 0;
  await Promise.all(
    symbols.map(async (sym) => {
      const h = await loadHoldings(sym);
      result.set(sym, h);
      done++;
      onProgress?.(done, symbols.length);
    })
  );
  return result;
}

/** Funds with 0 total holdings are fund-of-funds (LifeStrategy) — no data available. */
export function isFundOfFunds(h: FundHoldings): boolean {
  return h.holdingsCount.total === 0;
}
