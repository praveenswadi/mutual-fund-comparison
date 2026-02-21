export interface FundMeta {
  symbol: string;
  name: string;
  assetClass: string;
  riskLevel: number | null;
  expenseRatio: string;
  yield: { pct: string; type: string; asOf: string };
  returns: {
    ytd: string;
    oneYear: string;
    fiveYear: string;
    tenYear: string;
    sinceInception: string;
    inceptionDate: string;
  };
  minInvestment: string;
  nav: { price: string; change: string; changePct: string; direction: string };
}

export type HoldingType = "stock" | "bond";

export interface RawHolding {
  type: HoldingType;
  ticker: string | null;
  isin: string | null;
  cusip: string | null;
  name: string;
  sharesHeld: string;
  marketValue: number;
  percentWeight: string;
  // bond extras
  couponRate?: string;
  maturityDate?: string;
  faceAmount?: string;
}

export interface FundHoldings {
  symbol: string;
  name: string;
  assetClass: string;
  asOfDate: string;
  holdingsCount: { stock: number; bond: number; total: number };
  holdings: RawHolding[];
}

/** A holding enriched with a resolved stable ID and numeric weight. */
export interface ResolvedHolding {
  id: string;
  type: HoldingType;
  ticker: string | null;
  isin: string | null;
  name: string;
  weight: number; // parseFloat(percentWeight)
  marketValue: number;
  couponRate?: string;
  maturityDate?: string;
}

export type HoldingFilter = "all" | "stock" | "bond";

/** Result of comparing two funds. */
export interface PairOverlap {
  symbolA: string;
  symbolB: string;
  weightOverlap: number;       // sum of min(wA, wB) for shared IDs (absolute %)
  sharedCount: number;
  totalA: number;
  totalB: number;
  sumWeightA: number;          // actual sum of resolved weights in A (may be <100 if data is truncated)
  sumWeightB: number;
  coverageAbyB: number;        // weightOverlap / sumWeightA — "% of A's portfolio replicated in B"
  coverageBbyA: number;        // weightOverlap / sumWeightB — "% of B's portfolio replicated in A"
  containmentAinB: number;     // sharedCount / totalA — fraction of A's holdings present in B
  containmentBinA: number;     // sharedCount / totalB — fraction of B's holdings present in A
  sharedHoldings: SharedHolding[];
  uniqueA: ResolvedHolding[];
  uniqueB: ResolvedHolding[];
}

export interface SharedHolding {
  id: string;
  name: string;
  ticker: string | null;
  isin: string | null;
  type: HoldingType;
  weightA: number;
  weightB: number;
  minWeight: number;
}

/** Holding present in ALL selected funds. */
export interface IntersectionHolding {
  id: string;
  name: string;
  ticker: string | null;
  isin: string | null;
  type: HoldingType;
  weights: Record<string, number>; // symbol -> weight
  minWeight: number;
}
