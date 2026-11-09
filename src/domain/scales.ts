// Fixed diverging bins (MASTER_PLAN.md §5). Pure; no DOM.

/** Margin and margin-swing bin edges, in points. Symmetric around zero. */
export const MARGIN_EDGES = [1, 3, 6, 10, 15, 25, 40, 60] as const;

/** Neutral gray, then ColorBrewer RdBu-derived ramps, lightest to darkest. */
export const NEUTRAL_COLOR = '#e8e8e8';
export const BLUE_RAMP = ['#d1e5f0', '#a6cee3', '#67a9cf', '#3b8bc2', '#2166ac', '#08519c', '#08306b', '#000d2e'] as const;
export const RED_RAMP = ['#fddbc7', '#f4a582', '#e0765a', '#d6604d', '#b2182b', '#8c0f22', '#67001f', '#3a0010'] as const;

export interface Bin {
  /** index from -edges.length (strongest R) through 0 (neutral) to +edges.length (strongest D) */
  index: number;
  /** inclusive lower and exclusive upper bound, in metric units; infinities at the ends */
  lo: number;
  hi: number;
  color: string;
  label: string;
}

/**
 * Bin index for a value. 0 is neutral (|v| < first edge). Positive indexes are
 * Democratic direction. A value exactly on an edge goes to the larger-magnitude bin.
 */
export function binIndex(value: number, edges: readonly number[] = MARGIN_EDGES): number {
  const a = Math.abs(value);
  let k = 0;
  while (k < edges.length && a >= edges[k]!) k++;
  if (k === 0) return 0;
  return value < 0 ? -k : k;
}

export function binColor(index: number): string {
  if (index === 0) return NEUTRAL_COLOR;
  return index > 0 ? BLUE_RAMP[index - 1]! : RED_RAMP[-index - 1]!;
}

export function colorFor(value: number, edges: readonly number[] = MARGIN_EDGES): string {
  return binColor(binIndex(value, edges));
}

const fmt = (n: number) => String(n);

/** All bins from strongest R to strongest D, for the legend. */
export function marginBins(edges: readonly number[] = MARGIN_EDGES): Bin[] {
  const n = edges.length;
  const out: Bin[] = [];
  for (let i = -n; i <= n; i++) {
    const k = Math.abs(i);
    let lo: number;
    let hi: number;
    if (i === 0) {
      lo = -edges[0]!;
      hi = edges[0]!;
    } else if (i > 0) {
      lo = edges[k - 1]!;
      hi = k < n ? edges[k]! : Infinity;
    } else {
      hi = -edges[k - 1]!;
      lo = k < n ? -edges[k]! : -Infinity;
    }
    let label: string;
    if (i === 0) label = `−${fmt(edges[0]!)} to +${fmt(edges[0]!)}`;
    else if (i > 0) label = k < n ? `+${fmt(lo)} to +${fmt(hi)}` : `+${fmt(lo)} or more`;
    else label = k < n ? `−${fmt(-lo)} to −${fmt(-hi)}` :`−${fmt(-hi)} or more`;
    out.push({ index: i, lo, hi, color: binColor(i), label });
  }
  return out;
}
