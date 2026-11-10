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
