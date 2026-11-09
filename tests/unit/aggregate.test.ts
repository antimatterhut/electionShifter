import { describe, expect, it } from 'vitest';
import {
  aggregateCandidate,
  aggregateUnits,
  availableUnits,
  commonUnits,
  unitTotals,
} from '../../src/domain/aggregate.ts';
import {
  candidateChange,
  decomposeShift,
  margin,
  marginSwing,
  rawShift,
  turnoutChange,
} from '../../src/domain/metrics.ts';
import { cand, COLLIN, DENTON, makeRace, raceA, raceB } from './helpers.ts';

const both = [COLLIN, DENTON];

describe('Collin + Denton group (MASTER_PLAN §4)', () => {
  const ga = aggregateUnits(raceA, both).totals!;
  const gb = aggregateUnits(raceB, both).totals!;

  it('sums inputs', () => {
    expect([ga.d, ga.r, ga.t]).toEqual([413618, 530055, 966878]);
    expect([gb.d, gb.r, gb.t]).toEqual([463669, 374955, 853876]);
  });
  it('group margins', () => {
    expect(margin(ga).value).toBeCloseTo(-12.04, 2);
    expect(margin(gb).value).toBeCloseTo(10.39, 2);
  });
  it('swing is +22.43, not the 22.37 from averaging county swings', () => {
    const swing = marginSwing(ga, gb).value!;
    expect(swing.toFixed(2)).toBe('22.43');
    expect(swing.toFixed(2)).not.toBe('22.37');

    const countySwings = both.map((u) => marginSwing(unitTotals(raceA, u), unitTotals(raceB, u)).value!);
    const averaged = (countySwings[0]! + countySwings[1]!) / 2;
    expect(averaged.toFixed(2)).toBe('22.37');
  });
  it('raw shift and turnout', () => {
    expect(rawShift(ga, gb).value).toBe(205151);
    expect(turnoutChange(ga, gb).pct.value).toBeCloseTo(-11.69, 2);
  });
  it('decomposition sums exactly for the group', () => {
    const d = decomposeShift(ga, gb);
    expect(d.margin.value! + d.turnout.value!).toBe(205151);
  });
  it('group candidate change sums votes first', () => {
    const va = aggregateCandidate(raceA, 'harris', both).votes;
    const vb = aggregateCandidate(raceB, 'talarico', both).votes;
    expect(candidateChange(va, vb).raw.value).toBe(463669 - 413618);
  });
});

describe('multiple candidates in one party group', () => {
  it('sums every candidate on the same side', () => {
    const r = makeRace('multi', [{ id: '1', d: 0, r: 0, t: 100 }]);
    r.candidates = [cand('d1', 'D'), cand('d2', 'D'), cand('r1', 'R'), cand('l1', 'L')];
    r.votes = [[30], [15], [40], [10]];
    r.other_votes = [5];
    const t = unitTotals(r, '1')!;
    expect([t.d, t.r, t.t]).toEqual([45, 40, 100]);
  });
  it('uses aligned over group', () => {
    const r = makeRace('al', [{ id: '1', d: 0, r: 0, t: 100 }]);
    r.candidates = [cand('d1', 'D'), cand('i1', 'I', 'D'), cand('r1', 'R', null), cand('r2', 'D', 'R')];
    r.votes = [[10], [20], [30], [5]];
    const t = unitTotals(r, '1')!;
    expect([t.d, t.r]).toEqual([30, 35]);
  });
});

describe('missing units', () => {
  const r = makeRace('m', [
    { id: '1', d: 10, r: 20, t: 40 },
    { id: '2', d: null, r: null, t: null },
    { id: '3', d: 5, r: null, t: 30 },
    { id: '4', d: 1, r: 2, t: 4 },
  ]);

  it('excludes null units and reports them; null is not 0', () => {
    const g = aggregateUnits(r, ['1', '2', '3', '4']);
    expect(g.included).toEqual(['1', '4']);
    expect(g.missing).toEqual(['2', '3']);
    expect(g.requested).toBe(4);
    expect([g.totals!.d, g.totals!.r, g.totals!.t]).toEqual([11, 22, 44]);
  });
  it('unit absent from the race counts as missing', () => {
    const g = aggregateUnits(r, ['1', '99']);
    expect(g.missing).toEqual(['99']);
    expect(unitTotals(r, '99')).toBeNull();
  });
  it('all units missing gives null totals', () => {
    expect(aggregateUnits(r, ['2', '3']).totals).toBeNull();
    expect(aggregateUnits(r, []).totals).toBeNull();
  });
  it('commonUnits keeps only units usable in both races', () => {
    const other = makeRace('o', [
      { id: '1', d: 1, r: 1, t: 2 },
      { id: '2', d: 1, r: 1, t: 2 },
      { id: '4', d: null, r: 1, t: 2 },
    ]);
    expect(availableUnits(r, ['1', '2', '3', '4'])).toEqual(['1', '4']);
    expect(commonUnits(r, other, ['1', '2', '3', '4'])).toEqual(['1']);
  });
  it('a candidate vote of null in a non-D/R candidate does not drop the unit', () => {
    const x = makeRace('x', [{ id: '1', d: 1, r: 2, t: 5 }]);
    x.candidates.push(cand('lib', 'L'));
    x.votes.push([null]);
    expect(unitTotals(x, '1')).not.toBeNull();
  });
});

describe('aggregateCandidate', () => {
  it('reports candidates not on the ballot', () => {
    const c = aggregateCandidate(raceA, 'nobody', both);
    expect(c.onBallot).toBe(false);
    expect(c.votes).toBeNull();
  });
  it('skips null units and reports them', () => {
    const r = makeRace('c', [
      { id: '1', d: 5, r: 1, t: 6 },
      { id: '2', d: null, r: 1, t: 1 },
    ]);
    const c = aggregateCandidate(r, 'dem', ['1', '2']);
    expect(c).toMatchObject({ votes: 5, included: ['1'], missing: ['2'] });
  });
});
