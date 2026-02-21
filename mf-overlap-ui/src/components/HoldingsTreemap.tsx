import { useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import type { FundHoldings, RawHolding } from "../types";

const WIDTH = 750;
const HEIGHT = 420;
const THRESHOLD_PCT = 0.15;

const STOCK_COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#2563eb", "#1d4ed8"];
const BOND_COLORS  = ["#10b981", "#34d399", "#6ee7b7", "#059669", "#047857"];

interface TreeNode {
  name: string;
  ticker: string | null;
  weight: number;
  type: "stock" | "bond";
  isOther?: boolean;
  count?: number;
}

interface GroupNode {
  name: string;
  children: TreeNode[];
}

interface RootNode {
  name: string;
  children: GroupNode[];
}

function buildTree(holdings: RawHolding[]): RootNode {
  const stocks: RawHolding[] = [];
  const bonds: RawHolding[] = [];

  for (const h of holdings) {
    const w = parseFloat(h.percentWeight);
    if (isNaN(w) || w <= 0) continue;
    if (h.type === "stock") stocks.push(h);
    else bonds.push(h);
  }

  function bucket(items: RawHolding[], typeName: "stock" | "bond"): GroupNode {
    items.sort((a, b) => parseFloat(b.percentWeight) - parseFloat(a.percentWeight));

    const visible: TreeNode[] = [];
    let otherWeight = 0;
    let otherCount = 0;

    for (const h of items) {
      const w = parseFloat(h.percentWeight);
      if (w >= THRESHOLD_PCT) {
        visible.push({ name: h.name, ticker: h.ticker, weight: w, type: typeName });
      } else {
        otherWeight += w;
        otherCount++;
      }
    }

    if (otherCount > 0) {
      visible.push({
        name: `Other (${otherCount} holdings)`,
        ticker: null,
        weight: Math.round(otherWeight * 100) / 100,
        type: typeName,
        isOther: true,
        count: otherCount,
      });
    }

    const label = typeName === "stock" ? "Stocks" : "Bonds";
    return { name: label, children: visible };
  }

  const children: GroupNode[] = [];
  if (stocks.length > 0) children.push(bucket(stocks, "stock"));
  if (bonds.length > 0)  children.push(bucket(bonds, "bond"));

  return { name: "root", children };
}

export function HoldingsTreemap({ holdings }: { holdings: FundHoldings }) {
  const svgRef = useRef<SVGSVGElement>(null);

  const tree = useMemo(() => buildTree(holdings.holdings), [holdings]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const root = d3.hierarchy(tree)
      .sum((d: any) => d.weight ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    d3.treemap<any>()
      .size([WIDTH, HEIGHT])
      .paddingTop(22)
      .paddingRight(2)
      .paddingBottom(2)
      .paddingLeft(2)
      .paddingInner(2)
      (root);

    const stockScale = d3.scaleOrdinal(STOCK_COLORS);
    const bondScale = d3.scaleOrdinal(BOND_COLORS);

    // Group headers
    const groups = svg.selectAll("g.group")
      .data(root.children ?? [])
      .enter()
      .append("g")
      .attr("class", "group");

    groups.append("rect")
      .attr("x", (d: any) => d.x0)
      .attr("y", (d: any) => d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("fill", "none")
      .attr("stroke", "var(--border)")
      .attr("stroke-width", 1);

    groups.append("text")
      .attr("x", (d: any) => d.x0 + 6)
      .attr("y", (d: any) => d.y0 + 15)
      .text((d: any) => {
        const total = d.children?.reduce((s: number, c: any) => s + (c.value ?? 0), 0) ?? 0;
        return `${d.data.name} (${total.toFixed(1)}%)`;
      })
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("fill", "var(--muted)")
      .attr("letter-spacing", "0.03em");

    // Leaves
    const leaves = svg.selectAll("g.leaf")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("class", "leaf")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);

    leaves.append("rect")
      .attr("width", (d: any) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d: any) => Math.max(0, d.y1 - d.y0))
      .attr("rx", 3)
      .attr("fill", (d: any) => {
        const data = d.data as TreeNode;
        if (data.isOther) return data.type === "stock" ? "#1e3a5f" : "#1c2e2e";
        return data.type === "stock" ? stockScale(data.name) : bondScale(data.name);
      })
      .attr("opacity", (d: any) => (d.data as TreeNode).isOther ? 0.6 : 0.85)
      .attr("stroke", "var(--bg)")
      .attr("stroke-width", 1);

    // Labels (only if cell is large enough)
    leaves.each(function(this: SVGGElement, d: any) {
      const data = d.data as TreeNode;
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;

      if (w < 36 || h < 20) return;

      const g = d3.select(this);
      const label = data.ticker ?? data.name.substring(0, 12);
      const pct = `${data.weight.toFixed(data.weight >= 1 ? 1 : 2)}%`;

      g.append("text")
        .attr("x", 4)
        .attr("y", 13)
        .text(w > 55 ? label : label.substring(0, 5))
        .attr("font-size", h > 30 ? 11 : 9)
        .attr("font-weight", 700)
        .attr("fill", "#fff");

      if (h > 28) {
        g.append("text")
          .attr("x", 4)
          .attr("y", h > 30 ? 25 : 23)
          .text(pct)
          .attr("font-size", 9)
          .attr("font-weight", 500)
          .attr("fill", "rgba(255,255,255,.7)");
      }
    });

    // Tooltip on hover
    const tooltip = d3.select("body").append("div")
      .attr("class", "treemap-tooltip")
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("z-index", "10000")
      .style("background", "var(--tip-bg)")
      .style("border", "1px solid var(--tip-border)")
      .style("border-radius", "8px")
      .style("padding", "8px 12px")
      .style("font-size", "12px")
      .style("box-shadow", "0 4px 16px var(--shadow)")
      .style("display", "none")
      .style("max-width", "260px")
      .style("color", "var(--text)");

    leaves.on("mouseenter", function(_event: MouseEvent, d: any) {
      const data = d.data as TreeNode;
      const lines = [
        `<strong style="color:var(--accent2)">${data.ticker ?? ""}</strong> ${data.name}`,
        `<span style="color:var(--muted)">Weight:</span> <strong>${data.weight.toFixed(2)}%</strong>`,
        `<span style="color:var(--muted)">Type:</span> ${data.type === "stock" ? "Stock" : "Bond"}`,
      ];
      if (data.isOther && data.count) {
        lines[0] = `<strong>${data.name}</strong>`;
        lines.push(`<span style="color:var(--muted)">${data.count} individual holdings below ${THRESHOLD_PCT}%</span>`);
      }
      tooltip.html(lines.join("<br>")).style("display", "block");
    })
    .on("mousemove", function(event: MouseEvent) {
      tooltip
        .style("left", (event.clientX + 12) + "px")
        .style("top", (event.clientY - 10) + "px");
    })
    .on("mouseleave", function() {
      tooltip.style("display", "none");
    });

    return () => { tooltip.remove(); };
  }, [tree]);

  return (
    <div className="treemap-container">
      <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: "100%", height: "auto" }} />
    </div>
  );
}
