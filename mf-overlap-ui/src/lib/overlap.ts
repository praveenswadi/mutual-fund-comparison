import type {
  FundHoldings,
  HoldingFilter,
  IntersectionHolding,
  PairOverlap,
  ResolvedHolding,
  SharedHolding,
} from "../types";
import { resolveHolding } from "./id";

function buildMap(
  holdings: FundHoldings,
  filter: HoldingFilter
): Map<string, ResolvedHolding> {
  const map = new Map<string, ResolvedHolding>();
  for (const h of holdings.holdings) {
    if (filter !== "all" && h.type !== filter) continue;
    const r = resolveHolding(h);
    // If the same ID appears twice (e.g. bond with two tranches), accumulate weight
    const existing = map.get(r.id);
    if (existing) {
      existing.weight += r.weight;
    } else {
      map.set(r.id, r);
    }
  }
  return map;
}

export function computePairOverlap(
  a: FundHoldings,
  b: FundHoldings,
  filter: HoldingFilter
): PairOverlap {
  const mapA = buildMap(a, filter);
  const mapB = buildMap(b, filter);

  const shared: SharedHolding[] = [];
  let weightOverlap = 0;

  // Sum of all resolved weights (may be <100 when the holdings file is truncated)
  let sumA = 0;
  for (const r of mapA.values()) sumA += r.weight;
  let sumB = 0;
  for (const r of mapB.values()) sumB += r.weight;

  for (const [id, rA] of mapA) {
    const rB = mapB.get(id);
    if (!rB) continue;
    const minW = Math.min(rA.weight, rB.weight);
    weightOverlap += minW;
    shared.push({
      id,
      name: rA.name,
      ticker: rA.ticker,
      isin: rA.isin,
      type: rA.type,
      weightA: rA.weight,
      weightB: rB.weight,
      minWeight: minW,
    });
  }

  shared.sort((x, y) => y.minWeight - x.minWeight);

  const uniqueA = [...mapA.values()]
    .filter((r) => !mapB.has(r.id))
    .sort((x, y) => y.weight - x.weight);

  const uniqueB = [...mapB.values()]
    .filter((r) => !mapA.has(r.id))
    .sort((x, y) => y.weight - x.weight);

  const round2 = (n: number) => parseFloat(n.toFixed(2));

  // Directional: what fraction of each fund's weight is replicated in the other.
  // Guard against divide-by-zero for empty filter results.
  const coverageAbyB = sumA > 0 ? round2((weightOverlap / sumA) * 100) : 0;
  const coverageBbyA = sumB > 0 ? round2((weightOverlap / sumB) * 100) : 0;

  // Holdings containment: fraction of each fund's holdings count found in the other.
  const containmentAinB = mapA.size > 0 ? round2(shared.length / mapA.size) : 0;
  const containmentBinA = mapB.size > 0 ? round2(shared.length / mapB.size) : 0;

  return {
    symbolA: a.symbol,
    symbolB: b.symbol,
    weightOverlap: round2(weightOverlap),
    sharedCount: shared.length,
    totalA: mapA.size,
    totalB: mapB.size,
    sumWeightA: round2(sumA),
    sumWeightB: round2(sumB),
    coverageAbyB,
    coverageBbyA,
    containmentAinB,
    containmentBinA,
    sharedHoldings: shared,
    uniqueA,
    uniqueB,
  };
}

/**
 * Compute the pairwise overlap matrix for a list of funds.
 * Returns a map keyed by "SYMBA|SYMBB" (A < B alphabetically).
 */
export function computeMatrix(
  funds: FundHoldings[],
  filter: HoldingFilter
): Map<string, PairOverlap> {
  const result = new Map<string, PairOverlap>();
  for (let i = 0; i < funds.length; i++) {
    for (let j = i + 1; j < funds.length; j++) {
      const a = funds[i];
      const b = funds[j];
      const key = pairKey(a.symbol, b.symbol);
      result.set(key, computePairOverlap(a, b, filter));
    }
  }
  return result;
}

export function pairKey(symA: string, symB: string): string {
  return [symA, symB].sort().join("|");
}

/**
 * Holdings present in ALL given funds (intersection across N funds).
 */
export function computeIntersection(
  funds: FundHoldings[],
  filter: HoldingFilter
): IntersectionHolding[] {
  if (funds.length === 0) return [];

  const maps = funds.map((f) => buildMap(f, filter));
  const baseMap = maps[0];
  const result: IntersectionHolding[] = [];

  for (const [id, base] of baseMap) {
    const weights: Record<string, number> = { [funds[0].symbol]: base.weight };
    let inAll = true;
    for (let i = 1; i < maps.length; i++) {
      const r = maps[i].get(id);
      if (!r) { inAll = false; break; }
      weights[funds[i].symbol] = r.weight;
    }
    if (!inAll) continue;
    const vals = Object.values(weights);
    result.push({
      id,
      name: base.name,
      ticker: base.ticker,
      isin: base.isin,
      type: base.type,
      weights,
      minWeight: Math.min(...vals),
    });
  }

  result.sort((a, b) => b.minWeight - a.minWeight);
  return result;
}
