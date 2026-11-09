import { describe, expect, it } from 'vitest';
import { raceAfterYearChange, racesInYear, raceLabel, sortRaces, yearsOf } from '../../src/domain/races.ts';
import type { RaceMeta } from '../../src/domain/types.ts';
import { NOT_COMPARABLE, hasDrContest, notComparable, type ViewSpec } from '../../src/domain/view.ts';
import { cand, makeRace } from './helpers.ts';

function meta(year: number, office: string, label: string, seat: string | null = null): RaceMeta {
  return {
    race_id: `${year}-TX-${office}${seat ? `-${seat}` : ''}-gen`,
    year,
    election_date: `${year}-11-01`,
    state_po: 'TX',
    office,
    office_label: label,
    seat,
    stage: 'gen',
    status: 'unofficial',
    as_of: '2026-11-09',
    source_ids: ['x'],
    source_label: 'x',
    file: 'x.json',
    unit_count: 254,
    has_dem: true,
    has_rep: true,
    method_note: null,
    validation: { tier1: 'na', tier2: 'pending', max_diff_pct: 0 },
  };
}

const races = [
  meta(2024, 'us-senate', 'U.S. Senate'),
  meta(2026, 'railroad-commissioner', 'Railroad Commissioner'),
  meta(2024, 'president', 'President'),
  meta(2026, 'us-senate', 'U.S. Senate'),
  meta(2026, 'governor', 'Governor'),
  meta(2026, 'supreme-court', 'Supreme Court, Place 8', 'p8'),
  meta(2026, 'supreme-court', 'Supreme Court, Place 7', 'p7'),
  meta(2024, 'railroad-commissioner', 'Railroad Commissioner'),
];

describe('race picker helpers', () => {
  it('lists years newest first', () => {
    expect(yearsOf(races)).toEqual([2026, 2024]);
  });

  it('lists a year in office order, then label', () => {
    expect(racesInYear(races, 2026).map((r) => r.office_label)).toEqual([
      'U.S. Senate',
      'Governor',
      'Railroad Commissioner',
      'Supreme Court, Place 7',
      'Supreme Court, Place 8',
    ]);
    expect(racesInYear(races, 2024).map((r) => r.office)).toEqual(['president', 'us-senate', 'railroad-commissioner']);
  });

  it('sorts unknown offices last', () => {
    const odd = [meta(2026, 'zzz-new-office', 'Zzz'), meta(2026, 'governor', 'Governor')];
    expect(sortRaces(odd).map((r) => r.office)).toEqual(['governor', 'zzz-new-office']);
  });

  it('keeps the same office when the year changes, else the first race', () => {
    const rrc26 = races.find((r) => r.race_id === '2026-TX-railroad-commissioner-gen')!;
    expect(raceAfterYearChange(races, rrc26, 2024)!.race_id).toBe('2024-TX-railroad-commissioner-gen');
    const gov26 = races.find((r) => r.office === 'governor')!;
    expect(raceAfterYearChange(races, gov26, 2024)!.race_id).toBe('2024-TX-president-gen');
    const p8 = races.find((r) => r.seat === 'p8')!;
    expect(raceAfterYearChange(races, p8, 2026)!.seat).toBe('p8');
    expect(raceAfterYearChange(races, p8, 1999)).toBeNull();
  });

  it('labels a race with year and office', () => {
    expect(raceLabel(races[1]!)).toBe('2026 Railroad Commissioner');
  });
});

describe('not comparable', () => {
  const units = [{ id: '48001', d: 40, r: 60, t: 100 }];
  const contested = makeRace('c', units);
  const uncontested = { ...makeRace('u', units), candidates: [cand('only', 'R')], votes: [[60]], other_votes: [40] };
  const spec = (metric: ViewSpec['metric'], which: ViewSpec['which'] = 'B'): ViewSpec => ({
    metric,
    basis: 'total',
    which,
    candA: null,
    candB: null,
  });

  it('detects a race without a D or R candidate', () => {
    expect(hasDrContest(contested)).toBe(true);
    expect(hasDrContest(uncontested)).toBe(false);
  });

  it('blocks margin-based metrics when either race lacks a D–R contest', () => {
    for (const m of ['margin_swing', 'raw_shift', 'shift_from_margin', 'shift_from_turnout'] as const) {
      const msg = notComparable(spec(m), contested, uncontested, 'A', 'B');
      expect(msg).toContain(NOT_COMPARABLE);
      expect(msg).toContain('B');
      expect(notComparable(spec(m), uncontested, contested, 'A', 'B')).toContain('A');
    }
  });

  it('single-race metrics only need the race they read', () => {
    expect(notComparable(spec('margin', 'A'), contested, uncontested, 'A', 'B')).toBeNull();
    expect(notComparable(spec('raw_margin', 'B'), contested, uncontested, 'A', 'B')).toContain(NOT_COMPARABLE);
  });

  it('candidate and turnout metrics never need a D–R contest', () => {
    for (const m of ['candidate_change_raw', 'candidate_change_pct', 'turnout_change_raw', 'turnout_change_pct'] as const) {
      expect(notComparable(spec(m), contested, uncontested, 'A', 'B')).toBeNull();
    }
  });

  it('is null when both races are contested', () => {
    expect(notComparable(spec('margin_swing'), contested, contested, 'A', 'B')).toBeNull();
  });
});
