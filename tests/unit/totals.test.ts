import { describe, expect, it } from 'vitest';
import { pairTotals, votesFor } from '../../src/domain/totals.ts';
import type { RaceFile } from '../../src/domain/types.ts';

const race = (cands: [string, string, string][], votes: (number | null)[][], total: (number | null)[]): RaceFile =>
  ({
    units: ['1', '2', '3'],
    candidates: cands.map(([candidate_id, name, party]) => ({ candidate_id, name, party, group: party === 'DEM' ? 'D' : 'R', aligned: null })),
    votes,
    other_votes: total.map((t, i) => (t === null ? null : t - cands.reduce((s, _c, k) => s + (votes[k]![i] ?? 0), 0))),
    total_votes: total,
  }) as unknown as RaceFile;

describe('pairTotals', () => {
  const a = race([['x', 'X', 'REP'], ['y', 'Y', 'DEM']], [[10, 20, 30], [5, 5, 5]], [20, 30, 40]);
  const b = race([['z', 'Z', 'DEM']], [[1, null, 3]], [2, null, 6]);

  it('sums over counties present in both races and sorts by votes', () => {
    const t = pairTotals(a, b, ['1', '2', '3']);
    expect(t.used).toBe(2);
    expect(t.requested).toBe(3);
    expect(t.a.total).toBe(60);
    expect(t.a.rows.map((r) => r.candidateId)).toEqual(['x', 'y']);
    expect(votesFor(t.a, 'x')).toBe(40);
    expect(t.a.rows[0]!.share).toBeCloseTo(66.667, 2);
    expect(votesFor(t.b, 'z')).toBe(4);
    expect(votesFor(t.b, 'nope')).toBeNull();
  });
});

import { headToHead } from '../../src/domain/metrics.ts';
import { headToHeadSummary } from '../../src/domain/totals.ts';
import { metricValue, notComparable } from '../../src/domain/view.ts';

describe('head-to-head', () => {
  const mk = (cands: [string, string, 'D' | 'R'][], votes: number[][], total: number[]): RaceFile =>
    ({
      units: ['1', '2'],
      candidates: cands.map(([candidate_id, name, group]) => ({ candidate_id, name, party: group, group, aligned: null })),
      votes,
      other_votes: total.map((t, i) => t - votes.reduce((s, v) => s + v[i]!, 0)),
      total_votes: total,
    }) as unknown as RaceFile;
  // Race A has an R candidate (r1) and a D candidate (d1); race B has a D candidate (d2).
  const a = mk([['d1', 'D1', 'D'], ['r1', 'R1', 'R']], [[40, 10], [60, 30]], [100, 40]);
  const b = mk([['d2', 'D2', 'D'], ['r2', 'R2', 'R']], [[70, 5], [20, 25]], [90, 30]);

  it('formula: (D - R) / (D + R) in points', () => {
    expect(headToHead(75, 25).value).toBeCloseTo(50, 10);
    expect(headToHead(25, 75).value).toBeCloseTo(-50, 10);
    expect(headToHead(null, 5).value).toBeNull();
    expect(headToHead(0, 0).value).toBeNull();
  });

  it('pits the chosen candidate of A against the chosen candidate of B, either way round', () => {
    const spec = { metric: 'head_to_head' as const, basis: 'total' as const, which: 'B' as const, candA: 'r1', candB: 'd2' };
    // unit 1: R1 = 60 (race A), D2 = 70 (race B)
    expect(metricValue(spec, a, b, '1').value).toBeCloseTo(((70 - 60) / 130) * 100, 10);
    const s = headToHeadSummary(a, b, spec, ['1', '2'])!;
    expect(s.dFrom).toBe('B');
    expect(s.d.votes).toBe(75);
    expect(s.r.votes).toBe(90);
    expect(s.d.share + s.r.share).toBeCloseTo(100, 10);
    expect(s.d.counties).toBe(1);
    expect(s.r.counties).toBe(1);
    expect(s.rawMargin).toBe(-15);
  });

  it('is not comparable when both candidates are on the same side', () => {
    const spec = { metric: 'head_to_head' as const, basis: 'total' as const, which: 'B' as const, candA: 'd1', candB: 'd2' };
    expect(metricValue(spec, a, b, '1').value).toBeNull();
    expect(notComparable(spec, a, b, 'A', 'B')).toMatch(/one Democratic and one Republican/);
    expect(headToHeadSummary(a, b, spec, ['1', '2'])).toBeNull();
  });
});
