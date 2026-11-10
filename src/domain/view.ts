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
  headToHead,
} from './metrics.ts';
import {
  CANDIDATE_PCT_EDGES,
  MARGIN_EDGES,
  TURNOUT_PCT_EDGES,
  rawScale,
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
  'head_to_head',
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

/** Metrics that read the two chosen candidates (selectors shown). */
export const CANDIDATE_PICK_METRICS: ReadonlySet<MetricId> = new Set([
  'candidate_change_raw',
  'candidate_change_pct',
  'head_to_head',
]);

/**
 * The chosen candidate from each race, split into the D-side and R-side one. Null unless exactly
 * one of them is D-side and the other R-side.
 */
export function headToHeadSides(
  a: RaceFile,
  b: RaceFile,
  spec: Pick<ViewSpec, 'candA' | 'candB'>,
): { d: { race: RaceFile; id: string }; r: { race: RaceFile; id: string } } | null {
  const ia = pick(a, spec.candA);
  const ib = pick(b, spec.candB);
  if (ia === null || ib === null) return null;
  const sa = sideOf(a.candidates.find((c) => c.candidate_id === ia)!);
  const sb = sideOf(b.candidates.find((c) => c.candidate_id === ib)!);
  if (sa === 'D' && sb === 'R') return { d: { race: a, id: ia }, r: { race: b, id: ib } };
  if (sa === 'R' && sb === 'D') return { d: { race: b, id: ib }, r: { race: a, id: ia } };
  return null;
}

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
    case 'head_to_head': {
      const s = headToHeadSides(a, b, spec);
      if (s === null) return { value: null, reason: 'no_dr_contest' };
      return headToHead(candVotes(s.d.race, s.d.id, unitId), candVotes(s.r.race, s.r.id, unitId));
    }
    case 'turnout_change_raw':
      return turnoutChange(ta, tb).raw;
    case 'turnout_change_pct':
      return turnoutChange(ta, tb).pct;
  }
}

/** Color scale for a metric. Raw scales are chosen from the largest absolute value in view. */
export function scaleFor(metric: MetricId, values: readonly number[]): ScaleSpec {
  const maxAbs = values.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  switch (metric) {
    case 'margin':
    case 'margin_swing':
    case 'head_to_head':
      return { edges: MARGIN_EDGES, palette: 'partisan', unit: 'pts' };
    case 'raw_margin':
    case 'raw_shift':
    case 'shift_from_margin':
    case 'shift_from_turnout':
      return rawScale(maxAbs, 'partisan');
    case 'candidate_change_pct':
      return { edges: CANDIDATE_PCT_EDGES, palette: 'change', unit: 'pct' };
    case 'candidate_change_raw':
    case 'turnout_change_raw':
      return rawScale(maxAbs, 'change');
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

export const NOT_COMPARABLE = 'Not comparable: no D–R contest';

/** True when the race has both a D-side and an R-side candidate (aligned or by party). */
export function hasDrContest(race: RaceFile): boolean {
  const sides = new Set(race.candidates.map((c) => sideOf(c)));
  return sides.has('D') && sides.has('R');
}

/**
 * Why the chosen metric cannot be drawn for this pair, or null when it can. Margin-based metrics
 * need a D and an R candidate in every race they read; candidate and turnout metrics never do.
 */
export function notComparable(
  spec: ViewSpec,
  a: RaceFile,
  b: RaceFile,
  labelA: string,
  labelB: string,
): string | null {
  if (spec.metric === 'head_to_head') {
    return headToHeadSides(a, b, spec) === null
      ? 'Not comparable: pick one Democratic and one Republican candidate'
      : null;
  }
  if (CANDIDATE_METRICS.has(spec.metric) || spec.metric === 'turnout_change_pct' || spec.metric === 'turnout_change_raw') {
    return null;
  }
  const needed: [RaceFile, string][] = SINGLE_RACE_METRICS.has(spec.metric)
    ? [spec.which === 'A' ? [a, labelA] : [b, labelB]]
    : [
        [a, labelA],
        [b, labelB],
      ];
  const bad = needed.filter(([r]) => !hasDrContest(r)).map(([, l]) => l);
  return bad.length === 0 ? null : `${NOT_COMPARABLE} (${bad.join(', ')})`;
}
