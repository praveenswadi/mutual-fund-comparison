/**
 * Shared color scale used in the overlap matrix and weight bars.
 *
 * Semantic meaning:
 *   0%   → green  (good — low overlap / small holding weight)
 *  30%   → lime
 *  50%   → amber
 *  70%   → orange
 *  85%   → red    (bad — high overlap / large shared holding)
 * 100%   → purple (extreme)
 */
const COLOR_STOPS: Array<{ t: number; h: number; s: number; l: number }> = [
  { t: 0.00, h: 142, s: 70, l: 36 },
  { t: 0.30, h:  84, s: 68, l: 38 },
  { t: 0.50, h:  45, s: 96, l: 42 },
  { t: 0.70, h:  22, s: 90, l: 46 },
  { t: 0.85, h:   4, s: 84, l: 48 },
  { t: 1.00, h: 272, s: 65, l: 42 },
];

function lerpHue(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180)  diff -= 360;
  if (diff < -180) diff += 360;
  return (a + diff * t + 360) % 360;
}

/** Map a 0–100 value to an HSL color string using the overlap color scale. */
export function overlapColor(pct: number): string {
  const t = Math.min(100, Math.max(0, pct)) / 100;
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const a = COLOR_STOPS[i - 1];
    const b = COLOR_STOPS[i];
    if (t <= b.t) {
      const local = (t - a.t) / (b.t - a.t);
      const h = lerpHue(a.h, b.h, local);
      const s = a.s + (b.s - a.s) * local;
      const l = a.l + (b.l - a.l) * local;
      return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
    }
  }
  return `hsl(272, 65%, 42%)`;
}

/**
 * Map an individual holding weight (0–100%) to the color scale.
 *
 * Holdings rarely exceed 15% even for the largest positions, so we scale
 * so that ~15% weight maps to the red/orange zone (~80 on the 0–100 scale).
 * This makes large shared positions visually "alarming" and tiny ones green.
 *
 *   weight 0%   → scale 0   (green)
 *   weight 5%   → scale 33  (lime/yellow-green)
 *   weight 10%  → scale 67  (orange)
 *   weight 15%+ → scale 100 (red → purple)
 */
export function weightColor(weight: number): string {
  const scaled = Math.min(100, (weight / 15) * 100);
  return overlapColor(scaled);
}
