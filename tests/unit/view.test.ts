import { describe, expect, it } from 'vitest';
import { fmtMetric, fmtPct, fmtPts, fmtVotes, signed, titleCase } from '../../src/domain/format.ts';
import {
  CANDIDATE_PCT_EDGES,
  TURNOUT_PCT_EDGES,
  binsForScale,
  colorForScale,
  continuousColor,
  gradientLegend,
  rampsFor,
  symlogT,
} from '../../src/domain/scales.ts';
import type { RaceMeta } from '../../src/domain/types.ts';
import {
  METRIC_IDS,
  defaultCandidate,
  metricValue,
  scaleFor,
  turnoutNotice,
  unitDetail,
  type ViewSpec,
} from '../../src/domain/view.ts';
import { COLLIN, DENTON, raceA, raceB } from './helpers.ts';

const spec = (over: Partial<ViewSpec> = {}): ViewSpec => ({
  metric: 'margin_swing',
  basis: 'total',
  which: 'B',
  candA: null,
  candB: null,
  ...over,
});

describe('format', () => {
  it('uses U+2212 for negatives and + for positives', () => {
    expect(signed(-11.6, 2)).toBe('−11.60');
    expect(signed(23.18, 2)).toBe('+23.18');
    expect(fmtVotes(112726)).toBe('+112,726');
    expect(fmtVotes(-7257)).toBe('−7,257');
    expect(fmtPct(13.636)).toBe('+13.64%');
    expect(fmtPts(-0.001)).toBe('0.00 pts');
  });
  it('title-cases source names for display', () => {
    expect(titleCase("JAMES O'NEIL-SMITH")).toBe("James O'Neil-Smith");
  });
});

describe('metricValue (MASTER_PLAN §4, Collin)', () => {
  const v = (m: ViewSpec['metric'], over: Partial<ViewSpec> = {}) =>
    metricValue(spec({ metric: m, ...over }), raceA, raceB, COLLIN).value!;
  it('computes every selectable metric', () => {
    expect(METRIC_IDS).toHaveLength(11);
    expect(v('margin_swing')).toBeCloseTo(23.18, 2);
    expect(v('margin_swing', { basis: 'two_party' })).toBeCloseTo(23.75, 2);
    expect(v('raw_shift')).toBe(112726);
    expect(v('shift_from_margin')).toBe(119983);
    expect(v('shift_from_turnout')).toBe(-7257);
    expect(v('margin', { which: 'A' })).toBeCloseTo(-11.09, 2);
    expect(v('margin', { which: 'B' })).toBeCloseTo(12.09, 2);
    expect(v('raw_margin', { which: 'A' })).toBe(-57419);
    expect(v('raw_margin', { which: 'B' })).toBe(55307);
    expect(v('candidate_change_raw')).toBe(30288);
    expect(v('candidate_change_pct')).toBeCloseTo(13.64, 2);
    expect(v('turnout_change_raw')).toBe(-60049);
    expect(v('turnout_change_pct')).toBeCloseTo(-11.6, 2);
  });
  it('returns a reason, not a number, for a missing unit', () => {
    const r = metricValue(spec(), raceA, raceB, '48999');
    expect(r.value).toBeNull();
  });
  it('defaults candidates to the D side and honors a chosen one', () => {
    expect(defaultCandidate(raceA)).toBe('harris');
    expect(v('candidate_change_raw', { candA: 'trump', candB: 'paxton' })).toBe(197096 - 279534);
  });
});

describe('unitDetail', () => {
  it('has the Collin tooltip numbers', () => {
    const d = unitDetail(spec(), raceA, raceB, COLLIN);
    expect(fmtMetric('margin_swing', d.swing.value!)).toBe('+23.18 pts');
    expect(fmtVotes(d.rawShift.value!)).toBe('+112,726');
    expect(fmtVotes(d.candidate.raw.value!)).toBe('+30,288');
    expect(fmtPct(d.candidate.pct.value!)).toBe('+13.64%');
    expect(fmtPct(d.turnoutPct.value!)).toBe('−11.60%');
    expect(d.shiftFromMargin.value! + d.shiftFromTurnout.value!).toBe(d.rawShift.value);
    expect(d.missingIn).toEqual([]);
  });
  it('lists the races a unit is missing from', () => {
    expect(unitDetail(spec(), raceA, raceB, '48999').missingIn).toEqual(['A', 'B']);
  });
  it('sums Collin + Denton before computing, not averaging', () => {
    // Group math is covered in aggregate tests; per-unit values here must differ from the group's.
    expect(metricValue(spec(), raceA, raceB, DENTON).value).not.toBeCloseTo(22.43, 2);
  });
});

describe('scales per metric', () => {
  it('raw-vote scales are continuous, end at the largest value, and tick at powers of ten', () => {
    const s = scaleFor('raw_shift', [-3000, 98846]);
    expect(s.continuous).toEqual({ max: 98846 });
    expect(s.edges).toEqual([100, 1000, 10000]);
    expect(scaleFor('raw_shift', []).edges).toEqual([100]);
  });
  it('gives counties under 5,000 votes a tint on raw scales', () => {
    const s = scaleFor('raw_shift', [-3000, 112726]);
    expect(colorForScale(1500, s)).not.toBe(colorForScale(0, s));
    expect(colorForScale(700, s)).not.toBe(colorForScale(0, s));
    expect(colorForScale(1500, s)).not.toBe(colorForScale(4000, s));
  });
  it('every big county gets its own shade (the 98k, 52k, 43k, 42k, 32k, 31k, 30k case)', () => {
    const big = [98846, 52192, 43378, 42246, 31739, 31450, 30288];
    const s = scaleFor('candidate_change_raw', [...big, 166, -378]);
    expect(new Set(big.map((v) => colorForScale(v, s))).size).toBe(big.length);
    const small = [30, 100, 166, 300, 1000, 5406];
    expect(new Set(small.map((v) => colorForScale(v, s))).size).toBe(small.length);
  });
  it('is symmetric, neutral at zero, darker with size, and the max gets the darkest color', () => {
    const s = scaleFor('raw_shift', [-300000, 369761]);
    expect(colorForScale(0, s)).toBe('#e8e8e8');
    const ramps = rampsFor(s);
    expect(colorForScale(369761, s)).toBe(ramps.pos[7]);
    expect(colorForScale(-369761, s)).toBe(ramps.neg[7]);
    let prev = symlogT(0, 369761);
    for (const v of [10, 100, 1000, 10000, 100000, 369761]) {
      const t = symlogT(v, 369761);
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
    expect(symlogT(500000, 369761)).toBe(1); // clamped
    expect(continuousColor(-50, 1000, ramps)).not.toBe(continuousColor(50, 1000, ramps));
  });
  it('gradient legend runs from negative to positive with ticks at symmetric positions', () => {
    const g = gradientLegend(scaleFor('raw_shift', [-3000, 98846]));
    expect(g.stops[0]!.pos).toBe(0);
    expect(g.stops.at(-1)!.pos).toBe(1);
    expect(g.stops[20]!.color).toBe('#e8e8e8');
    const zero = g.ticks.find((t) => t.value === 0)!;
    expect(zero.pos).toBe(0.5);
    const p = g.ticks.find((t) => t.value === 1000)!;
    const n = g.ticks.find((t) => t.value === -1000)!;
    expect(p.pos + n.pos).toBeCloseTo(1, 10);
  });
  it('uses the fixed percent edges and non-partisan colors for candidate/turnout', () => {
    const c = scaleFor('candidate_change_pct', []);
    const t = scaleFor('turnout_change_pct', []);
    expect(c.edges).toEqual(CANDIDATE_PCT_EDGES);
    expect(t.edges).toEqual(TURNOUT_PCT_EDGES);
    expect(c.palette).toBe('change');
    expect(scaleFor('turnout_change_raw', [5]).palette).toBe('change');
    expect(scaleFor('raw_shift', [5]).palette).toBe('partisan');
  });
  it('is symmetric with a neutral center on every scale', () => {
    for (const m of METRIC_IDS) {
      const s = scaleFor(m, [-3000, 80000]);
      expect(colorForScale(0, s)).toBe(colorForScale(0.0001, s));
      if (s.continuous) continue; // continuous scales are covered above
      const bins = binsForScale(s, String);
      expect(bins).toHaveLength(2 * s.edges.length + 1);
      expect(new Set(bins.map((b) => b.color)).size).toBe(bins.length);
      const mid = Math.floor(bins.length / 2);
      for (let k = 1; k <= mid; k++) {
        expect(bins[mid + k]!.lo).toBe(-bins[mid - k]!.hi);
      }
    }
  });
  it('labels percent bins with a % sign', () => {
    const bins = binsForScale(scaleFor('turnout_change_pct', []), (n) => `${n}%`);
    expect(bins[0]!.label).toBe('−40% or more');
    expect(bins[6]!.label).toBe('−2% to +2%');
  });
});

describe('turnoutNotice', () => {
  const meta = (year: number, office: string): RaceMeta => ({ year, office }) as RaceMeta;
  it('appears for a midterm vs a presidential race', () => {
    const n = turnoutNotice(meta(2024, 'president'), meta(2026, 'us-senate'), 100, 99);
    expect(n).toContain('Fewer people voted in 2026');
    expect(n).toContain('Turnout view');
  });
  it('appears when totals change by more than 10%, and not otherwise', () => {
    expect(turnoutNotice(meta(2024, 'president'), meta(2024, 'us-senate'), 100, 85)).not.toBeNull();
    expect(turnoutNotice(meta(2024, 'president'), meta(2024, 'us-senate'), 100, 95)).toBeNull();
    expect(turnoutNotice(meta(2022, 'us-senate'), meta(2026, 'us-senate'), 100, 105)).toBeNull();
  });
});
