// Fixed diverging bins (MASTER_PLAN.md §5). Pure; no DOM.

/** Margin and margin-swing bin edges, in points. Symmetric around zero. */
export const MARGIN_EDGES = [1, 3, 6, 10, 15, 25, 40, 60] as const;

/** Neutral gray, then ColorBrewer RdBu-derived ramps, lightest to darkest. */
export const NEUTRAL_COLOR = '#e8e8e8';
export const BLUE_RAMP = ['#d1e5f0', '#a6cee3', '#67a9cf', '#3b8bc2', '#2166ac', '#08519c', '#08306b', '#000d2e'] as const;
export const RED_RAMP = ['#fddbc7', '#f4a582', '#e0765a', '#d6604d', '#b2182b', '#8c0f22', '#67001f', '#3a0010'] as const;

/** Six-step ramps for the smaller scales (percent and 1-2-5 raw scales). Lightest to darkest. */
export const BLUE_RAMP6 = ['#d1e5f0', '#92c5de', '#4393c3', '#2166ac', '#08519c', '#08306b'] as const;
export const RED_RAMP6 = ['#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#8c0f22', '#67001f'] as const;
/** Non-partisan: green = increase, purple = decrease. ColorBrewer PRGn-derived. */
export const GREEN_RAMP6 = ['#d9f0d3', '#acd9a5', '#7fbf7b', '#4d9a52', '#1b7837', '#00441b'] as const;
export const PURPLE_RAMP6 = ['#e7d4e8', '#c2a5cf', '#9970ab', '#762a83', '#5a1a68', '#40004b'] as const;

/** Positive-side and negative-side ramps. */
export interface Ramps {
  pos: readonly string[];
  neg: readonly string[];
}
export const PARTISAN_8: Ramps = { pos: BLUE_RAMP, neg: RED_RAMP };
export const PARTISAN_6: Ramps = { pos: BLUE_RAMP6, neg: RED_RAMP6 };
export const CHANGE_6: Ramps = { pos: GREEN_RAMP6, neg: PURPLE_RAMP6 };
/** Eight-step non-partisan ramps for raw-vote change scales. */
export const GREEN_RAMP8 = ['#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'] as const;
export const PURPLE_RAMP8 = ['#f2e6f5', '#e0cfe8', '#c2a5cf', '#a77fba', '#8856a0', '#762a83', '#5a1a68', '#40004b'] as const;
export const CHANGE_8: Ramps = { pos: GREEN_RAMP8, neg: PURPLE_RAMP8 };

export type Palette = 'partisan' | 'change';
export type Unit = 'pts' | 'pct' | 'votes';

/** Percent-change edges (candidate change). */
export const CANDIDATE_PCT_EDGES = [2, 5, 10, 20, 35, 50] as const;
/** Percent-change edges (turnout change). */
export const TURNOUT_PCT_EDGES = [2, 5, 10, 20, 30, 40] as const;

/**
 * Eight 1-2-5 edges for a raw-vote scale, so small counties still get a tint. The top edge is
 * the largest 1-2-5 value not above maxAbs (at least 200), so the scale follows the largest value in view.
 */
export function rawEdges(maxAbs: number): number[] {
  const seq: number[] = [];
  for (let p = 1; p <= 1e9; p *= 10) seq.push(p, 2 * p, 5 * p);
  let top = 7;
  while (top + 1 < seq.length && seq[top + 1]! <= maxAbs) top++;
  return seq.slice(top - 7, top + 1);
}

export interface ScaleSpec {
  edges: readonly number[];
  palette: Palette;
  unit: Unit;
}

export function rampsFor(spec: ScaleSpec): Ramps {
  if (spec.palette === 'change') return spec.edges.length === 8 ? CHANGE_8 : CHANGE_6;
  return spec.edges.length === 8 ? PARTISAN_8 : PARTISAN_6;
}

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

export function binColor(index: number, ramps: Ramps = PARTISAN_8): string {
  if (index === 0) return NEUTRAL_COLOR;
  return index > 0 ? ramps.pos[index - 1]! : ramps.neg[-index - 1]!;
}

export function colorFor(
  value: number,
  edges: readonly number[] = MARGIN_EDGES,
  ramps: Ramps = PARTISAN_8,
): string {
  return binColor(binIndex(value, edges), ramps);
}

/** Fill color for a value on a scale. */
export function colorForScale(value: number, spec: ScaleSpec): string {
  return colorFor(value, spec.edges, rampsFor(spec));
}

const plain = (n: number) => String(n);

/** All bins from strongest R to strongest D, for the legend. */
export function marginBins(
  edges: readonly number[] = MARGIN_EDGES,
  ramps: Ramps = PARTISAN_8,
  fmt: (n: number) => string = plain,
): Bin[] {
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
    else label = k < n ? `−${fmt(-lo)} to −${fmt(-hi)}` : `−${fmt(-hi)} or more`;
    out.push({ index: i, lo, hi, color: binColor(i, ramps), label });
  }
  return out;
}

/** Legend bins for a scale. `fmt` formats an unsigned edge, e.g. "5%" or "2,000". */
export function binsForScale(spec: ScaleSpec, fmt: (n: number) => string): Bin[] {
  return marginBins(spec.edges, rampsFor(spec), fmt);
}
