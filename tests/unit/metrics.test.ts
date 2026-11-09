import { describe, expect, it } from 'vitest';
import { unitTotals } from '../../src/domain/aggregate.ts';
import {
  candidateChange,
  decomposeShift,
  margin,
  marginSwing,
  rawMargin,
  rawShift,
  turnoutChange,
} from '../../src/domain/metrics.ts';
import { cand, COLLIN, makeRace, raceA, raceB } from './helpers.ts';

const a = unitTotals(raceA, COLLIN);
const b = unitTotals(raceB, COLLIN);

describe('MASTER_PLAN §4 worked example (Collin)', () => {
  it('raw margin', () => {
    expect(rawMargin(a).value).toBe(-57419);
    expect(rawMargin(b).value).toBe(55307);
  });
  it('margin, total basis', () => {
    expect(margin(a).value).toBeCloseTo(-11.09, 2);
    expect(margin(b).value).toBeCloseTo(12.09, 2);
  });
  it('margin, two-party basis', () => {
    expect(margin(a, 'two_party').value).toBeCloseTo(-11.45, 2);
    expect(margin(b, 'two_party').value).toBeCloseTo(12.3, 2);
  });
  it('margin swing', () => {
    expect(marginSwing(a, b).value).toBeCloseTo(23.18, 2);
  });
  it('raw margin shift', () => {
    expect(rawShift(a, b).value).toBe(112726);
  });
  it('candidate change, raw and percent', () => {
    const r = candidateChange(222115, 252403);
    expect(r.raw.value).toBe(30288);
    expect(r.pct.value).toBeCloseTo(13.64, 2);
  });
  it('turnout change, raw and percent', () => {
    const r = turnoutChange(a, b);
    expect(r.raw.value).toBe(-60049);
    expect(r.pct.value).toBeCloseTo(-11.6, 2);
  });
  it('shift decomposition', () => {
    const d = decomposeShift(a, b);
    expect(d.margin.value).toBe(119983);
    expect(d.turnout.value).toBe(-7257);
  });
});

describe('decomposeShift', () => {
  it('sums exactly to raw shift, total basis', () => {
    const d = decomposeShift(a, b);
    expect(d.margin.value! + d.turnout.value!).toBe(rawShift(a, b).value);
  });
  it('sums exactly to raw shift, two-party basis', () => {
    const d = decomposeShift(a, b, 'two_party');
    expect(Number.isInteger(d.margin.value)).toBe(true);
    expect(d.margin.value! + d.turnout.value!).toBe(rawShift(a, b).value);
  });
  it('two-party margin part matches (m_B - m_A) x (D+R)_A', () => {
    const d = decomposeShift(a, b, 'two_party');
    const expected = ((margin(b, 'two_party').value! - margin(a, 'two_party').value!) / 100) * (a!.d + a!.r);
    expect(Math.abs(d.margin.value! - expected)).toBeLessThanOrEqual(0.5);
  });
  it('propagates reason codes', () => {
    expect(decomposeShift(null, b).margin).toEqual({ value: null, reason: 'missing_unit' });
  });
});

describe('edge cases', () => {
  it('race with no R: margin metrics unavailable with no_dr_contest', () => {
    const noR = makeRace('x', [{ id: '1', d: 10, r: 0, t: 10 }]);
    noR.candidates = [cand('only-d', 'D')];
    noR.votes = [[10]];
    const t = unitTotals(noR, '1');
    expect(t).not.toBeNull();
    expect(margin(t)).toEqual({ value: null, reason: 'no_dr_contest' });
    expect(rawMargin(t)).toEqual({ value: null, reason: 'no_dr_contest' });
    expect(marginSwing(t, b)).toEqual({ value: null, reason: 'no_dr_contest' });
    expect(marginSwing(a, t)).toEqual({ value: null, reason: 'no_dr_contest' });
    expect(rawShift(a, t)).toEqual({ value: null, reason: 'no_dr_contest' });
    // turnout is still available
    expect(turnoutChange(a, t).raw.value).toBe(10 - 517690);
  });
  it('alignment override restores a D-R contest', () => {
    const r = makeRace('x', [{ id: '1', d: 0, r: 60, t: 100 }]);
    r.candidates = [cand('ind', 'I', 'D'), cand('rep', 'R')];
    r.votes = [[40], [60]];
    expect(rawMargin(unitTotals(r, '1')).value).toBe(-20);
  });
  it('zero baseline: percent unavailable, raw still shown', () => {
    const r = candidateChange(0, 500);
    expect(r.raw.value).toBe(500);
    expect(r.pct).toEqual({ value: null, reason: 'zero_baseline' });
  });
  it('null candidate votes give missing_unit', () => {
    expect(candidateChange(null, 5).raw).toEqual({ value: null, reason: 'missing_unit' });
  });
  it('zero or null total is missing', () => {
    const z = makeRace('z', [{ id: '1', d: 0, r: 0, t: 0 }]);
    const zt = unitTotals(z, '1');
    expect(margin(zt)).toEqual({ value: null, reason: 'missing_total' });
    expect(margin(zt, 'two_party')).toEqual({ value: null, reason: 'missing_total' });
    expect(turnoutChange(zt, b).pct).toEqual({ value: null, reason: 'missing_total' });
    const n = makeRace('n', [{ id: '1', d: 1, r: 1, t: null }]);
    expect(unitTotals(n, '1')).toBeNull();
    expect(margin(unitTotals(n, '1'))).toEqual({ value: null, reason: 'missing_unit' });
  });
  it('two-party basis with D+R = 0 is missing even if T > 0', () => {
    const r = makeRace('w', [{ id: '1', d: 0, r: 0, t: 5 }]);
    expect(margin(unitTotals(r, '1'), 'two_party')).toEqual({ value: null, reason: 'missing_total' });
    expect(margin(unitTotals(r, '1')).value).toBe(0);
  });
  it('is pure: inputs are not mutated', () => {
    const before = JSON.stringify([a, b]);
    marginSwing(a, b);
    decomposeShift(a, b);
    expect(JSON.stringify([a, b])).toBe(before);
  });
});
