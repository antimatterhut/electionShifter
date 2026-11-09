// Per-unit metric values and tooltip detail for a chosen metric. Pure; no DOM.
import { aggregateCandidate, sideOf, unitTotals } from './aggregate.ts';
import {
  candidateChange,
  decomposeShift,
  margin,
  marginSwing,
  rawMargin,
  rawShift,
  turnoutChange,
} from './metrics.ts';
import {
  CANDIDATE_PCT_EDGES,
  MARGIN_EDGES,
  TURNOUT_PCT_EDGES,
  rawEdges,
  type ScaleSpec,
} from './scales.ts';
import type { Basis, MetricId, MetricResult, RaceFile, RaceMeta, Totals } from './types.ts';

export type Which = 'A' | 'B';

export interface ViewSpec {
  metric: MetricId;
  basis: Basis;
  /** Which race a single-race metric (margin, raw margin) reads. */
  which: Which;
  /** Candidate ids for the candidate metrics; null = default. */
  candA: string | null;
  candB: string | null;
}

export const METRIC_IDS: MetricId[] = [
  'margin_swing',
  'raw_shift',
  'shift_from_margin',
  'shift_from_turnout',
  'margin',
  'raw_margin',
  'candidate_change_pct',
  'candidate_change_raw',
  'turnout_change_pct',
  'turnout_change_raw',
];

/** Metrics whose value depends on the D/R basis. */
export const BASIS_METRICS: ReadonlySet<MetricId> = new Set([
  'margin',
  'margin_swing',
  'shift_from_margin',
  'shift_from_turnout',
]);
export const SINGLE_RACE_METRICS: ReadonlySet<MetricId> = new Set(['margin', 'raw_margin']);
export const CANDIDATE_METRICS: ReadonlySet<MetricId> = new Set([
  'candidate_change_raw',
  'candidate_change_pct',
]);

/** D-side candidate if the race has one, else the first candidate, else null. */
export function defaultCandidate(race: RaceFile): string | null {
  const d = race.candidates.find((c) => sideOf(c) === 'D');
  return (d ?? race.candidates[0])?.candidate_id ?? null;
}

function pick(race: RaceFile, id: string | null): string | null {
  if (id !== null && race.candidates.some((c) => c.candidate_id === id)) return id;
  return defaultCandidate(race);
}

function candVotes(race: RaceFile, cand: string | null, unitId: string): number | null {
  if (cand === null) return null;
  return aggregateCandidate(race, cand, [unitId]).votes;
}

export function metricValue(
  spec: ViewSpec,
  a: RaceFile,
  b: RaceFile,
  unitId: string,
): MetricResult {
  const ta = unitTotals(a, unitId);
  const tb = unitTotals(b, unitId);
  switch (spec.metric) {
    case 'raw_margin':
      return rawMargin(spec.which === 'A' ? ta : tb);
    case 'margin':
      return margin(spec.which === 'A' ? ta : tb, spec.basis);
    case 'margin_swing':
      return marginSwing(ta, tb, spec.basis);
    case 'raw_shift':
      return rawShift(ta, tb);
    case 'shift_from_margin':
      return decomposeShift(ta, tb, spec.basis).margin;
    case 'shift_from_turnout':
      return decomposeShift(ta, tb, spec.basis).turnout;
    case 'candidate_change_raw':
    case 'candidate_change_pct': {
      const c = candidateChange(
        candVotes(a, pick(a, spec.candA), unitId),
        candVotes(b, pick(b, spec.candB), unitId),
      );
      return spec.metric === 'candidate_change_raw' ? c.raw : c.pct;
    }
    case 'turnout_change_raw':
      return turnoutChange(ta, tb).raw;
    case 'turnout_change_pct':
      return turnoutChange(ta, tb).pct;
  }
}

/** 95th-percentile absolute value (nearest rank). Big counties would otherwise set the whole scale. */
export function p95Abs(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const a = values.map(Math.abs).sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.ceil(0.95 * a.length) - 1)]!;
}

/**
 * Color scale for a metric. Raw scales are chosen from the values in view: the top edge comes from
 * the 95th-percentile absolute value, so a few very large counties land in the open-ended top bin
 * instead of pushing every small county into the neutral bin.
 */
export function scaleFor(metric: MetricId, values: readonly number[]): ScaleSpec {
  const maxAbs = p95Abs(values);
  switch (metric) {
    case 'margin':
    case 'margin_swing':
      return { edges: MARGIN_EDGES, palette: 'partisan', unit: 'pts' };
    case 'raw_margin':
    case 'raw_shift':
    case 'shift_from_margin':
    case 'shift_from_turnout':
      return { edges: rawEdges(maxAbs), palette: 'partisan', unit: 'votes' };
    case 'candidate_change_pct':
      return { edges: CANDIDATE_PCT_EDGES, palette: 'change', unit: 'pct' };
    case 'candidate_change_raw':
    case 'turnout_change_raw':
      return { edges: rawEdges(maxAbs), palette: 'change', unit: 'votes' };
    case 'turnout_change_pct':
      return { edges: TURNOUT_PCT_EDGES, palette: 'change', unit: 'pct' };
  }
}

export interface UnitDetail {
  unitId: string;
  a: Totals | null;
  b: Totals | null;
  marginA: MetricResult;
  marginB: MetricResult;
  swing: MetricResult;
  rawShift: MetricResult;
  shiftFromMargin: MetricResult;
  shiftFromTurnout: MetricResult;
  turnoutRaw: MetricResult;
  turnoutPct: MetricResult;
  candidate: {
    idA: string | null;
    idB: string | null;
    votesA: number | null;
    votesB: number | null;
    raw: MetricResult;
    pct: MetricResult;
  };
  /** Which races have no usable data for this unit. */
  missingIn: Which[];
}

export function unitDetail(spec: ViewSpec, a: RaceFile, b: RaceFile, unitId: string): UnitDetail {
  const ta = unitTotals(a, unitId);
  const tb = unitTotals(b, unitId);
  const idA = pick(a, spec.candA);
  const idB = pick(b, spec.candB);
  const vA = candVotes(a, idA, unitId);
  const vB = candVotes(b, idB, unitId);
  const dec = decomposeShift(ta, tb, spec.basis);
  const t = turnoutChange(ta, tb);
  const c = candidateChange(vA, vB);
  const missingIn: Which[] = [];
  if (ta === null) missingIn.push('A');
  if (tb === null) missingIn.push('B');
  return {
    unitId,
    a: ta,
    b: tb,
    marginA: margin(ta, spec.basis),
    marginB: margin(tb, spec.basis),
    swing: marginSwing(ta, tb, spec.basis),
    rawShift: rawShift(ta, tb),
    shiftFromMargin: dec.margin,
    shiftFromTurnout: dec.turnout,
    turnoutRaw: t.raw,
    turnoutPct: t.pct,
    candidate: { idA, idB, votesA: vA, votesB: vB, raw: c.raw, pct: c.pct },
    missingIn,
  };
}

/** Presidential years are divisible by 4. */
function isPresidential(m: RaceMeta): boolean {
  return m.office === 'president';
}

/**
 * Turnout notice (MASTER_PLAN §5): shown when a midterm is compared with a presidential
 * race, or when total votes changed by more than 10%. Returns null when not needed.
 * `totalsA`/`totalsB` are summed over the units in view.
 */
export function turnoutNotice(
  metaA: RaceMeta,
  metaB: RaceMeta,
  totalsA: number,
  totalsB: number,
): string | null {
  const midtermVsPres =
    (isPresidential(metaA) && !isPresidential(metaB) && metaB.year % 4 !== 0) ||
    (isPresidential(metaB) && !isPresidential(metaA) && metaA.year % 4 !== 0);
  const change = totalsA > 0 ? (totalsB - totalsA) / totalsA : 0;
  if (!midtermVsPres && Math.abs(change) <= 0.1) return null;
  const fewer = totalsB < totalsA;
  return fewer
    ? `Fewer people voted in ${metaB.year}, which shrinks raw vote numbers everywhere. Margin swing isn't affected by total turnout the same way. See the Turnout view.`
    : `More people voted in ${metaB.year}, which inflates raw vote numbers everywhere. Margin swing isn't affected by total turnout the same way. See the Turnout view.`;
}
