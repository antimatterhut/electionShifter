import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Crosswalk, normLabel } from '../../pipeline/crosswalk.ts';
import type { Unit } from '../../pipeline/geo.ts';
import { buildRace, partyInfo, slug } from '../../pipeline/normalize.ts';
import { pushbuildAdapter } from '../../pipeline/sources/pushbuild.ts';
import { tlcAdapter } from '../../pipeline/sources/tlc.ts';
import { STATEWIDE_UNIT, type RaceMapRow, type Row } from '../../pipeline/types.ts';
import { assertChecks, assertComplete, tier1, tier2 } from '../../pipeline/validate.ts';

const fx = (n: string) => readFileSync(join(process.cwd(), 'tests/fixtures', n), 'utf8');
const unit = (unit_id: string, name: string): Unit => ({
  unit_id,
  state_po: 'TX',
  name,
  kind: 'county',
  geo_key: unit_id,
  valid_from: '2025c',
  valid_to: '',
});
const xw = new Crosswalk(
  [unit('48001', 'Alpha'), unit('48003', 'DeWitt'), unit('48005', 'Gamma')],
  [{ source_id: 'tlc-2024', state_po: 'TX', source_label: 'unused', unit_id: '48005' }],
);
const R = 'r1';
const row = (unit_id: string, candidate: string, party: string, votes: number | null): Row => ({
  race_id: R,
  unit_id,
  candidate,
  party,
  votes,
});
const mapRow = (over: Partial<RaceMapRow>): RaceMapRow => ({
  source_id: 'pushbuild-2026',
  source_file: 'x.csv',
  source_contest: 'U. S. SENATOR',
  race_id: R,
  year: '2026',
  election_date: '',
  state_po: 'TX',
  office: 'us-senate',
  office_label: '',
  seat: '',
  stage: 'gen',
  status: 'unofficial',
  as_of: '',
  source_label: '',
  method_note: '',
  ...over,
});

describe('label normalization', () => {
  it('normalizes for lookup only', () => {
    expect(normLabel('  Doña  Ana. ')).toBe('DONA ANA');
    expect(normLabel('St. Marys')).toBe('ST MARYS');
  });

  it('throws on an unmatched label and never fuzzy matches', () => {
    expect(() => xw.resolve('pushbuild-2026', 'TX', 'Alphaa')).toThrow(/Unmatched geography label "Alphaa"/);
  });

  it('resolves by exact normalized name and by source-specific alias', () => {
    expect(xw.resolve('pushbuild-2026', 'TX', 'Dewitt')).toBe('48003');
    expect(xw.resolve('tlc-2024', 'TX', 'unused')).toBe('48005');
    expect(() => xw.resolve('pushbuild-2026', 'TX', 'unused')).toThrow();
  });
});

describe('buildRace', () => {
  const units = ['48001', '48003'];

  it('fuses lines for one candidate and picks the major-party group', () => {
    const race = buildRace(R, units, [
      row('48001', 'A', 'DEM', 100),
      row('48001', 'A', 'WF', 7),
      row('48001', 'B', 'REP', 50),
      row('48003', 'A', 'DEM', 10),
      row('48003', 'A', 'WF', 1),
      row('48003', 'B', 'REP', 5),
    ]);
    expect(race.candidates.map((c) => [c.candidate_id, c.party, c.group])).toEqual([
      ['a', 'DEM', 'D'],
      ['b', 'REP', 'R'],
    ]);
    expect(race.votes).toEqual([
      [107, 11],
      [50, 5],
    ]);
    expect(race.total_votes).toEqual([157, 16]);
  });

  it('uses the largest line as group when no line is a major party', () => {
    const race = buildRace(R, ['48001'], [row('48001', 'C', 'WF', 4), row('48001', 'C', 'IND', 9)]);
    expect(race.candidates[0]!.party).toBe('IND');
    expect(race.candidates[0]!.group).toBe('I');
    expect(race.votes).toEqual([[13]]);
  });

  it('puts write-ins in other_votes and keeps quoted names', () => {
    const race = buildRace(R, ['48001'], [
      row('48001', 'BRADFORD "BRAD" HALL', 'LIB', 3),
      row('48001', 'WRITE-IN', 'W', 2),
      row('48001', 'ZED', 'W', 4),
    ]);
    expect(race.candidates.map((c) => c.name)).toEqual(['BRADFORD "BRAD" HALL']);
    expect(race.candidates[0]!.candidate_id).toBe('bradford-brad-hall');
    expect(race.other_votes).toEqual([6]);
    expect(race.total_votes).toEqual([9]);
  });

  it('keeps suppressed values null and marks missing units null, never 0', () => {
    const race = buildRace(R, units, [row('48001', 'A', 'DEM', null), row('48001', 'B', 'REP', 5)]);
    expect(race.votes).toEqual([
      [null, null],
      [5, null],
    ]);
    expect(race.total_votes).toEqual([null, null]);
    expect(() => assertComplete(race)).toThrow();
  });

  it('combined party codes use the first recognized party', () => {
    expect(partyInfo('NON/DEM')).toMatchObject({ code: 'DEM', group: 'D', combined: true });
    expect(partyInfo('DEM')).toMatchObject({ group: 'D', combined: false });
    expect(partyInfo('XYZ').group).toBe('O');
  });

  it('rejects a candidate_id clash and rows outside the unit list', () => {
    expect(() => buildRace(R, ['48001'], [row('48001', 'A. B', 'DEM', 1), row('48001', 'A B', 'REP', 1)])).toThrow(
      /clash/,
    );
    expect(() => buildRace(R, ['48001'], [row('48003', 'A', 'DEM', 1)])).toThrow(/outside/);
  });

  it('slugs names', () => {
    expect(slug('JAMES TALARICO')).toBe('james-talarico');
  });
});

describe('adapters', () => {
  it('pushbuild: maps contest, resolves counties, splits statewide rows, ignores other contests', () => {
    const res = pushbuildAdapter(fx('pushbuild-sample.csv'), [mapRow({})], xw);
    expect(res.rows).toHaveLength(6);
    expect(res.statewide).toHaveLength(3);
    expect(new Set(res.rows.map((r) => r.unit_id))).toEqual(new Set(['48001', '48003']));
    const race = buildRace(R, ['48001', '48003'], res.rows);
    const state = buildRace(R, [STATEWIDE_UNIT], res.statewide);
    expect(race.votes).toEqual([
      [100, 200],
      [60, 140],
    ]);
    expect(race.other_votes).toEqual([10, 10]);
    expect(tier1(race, state)).toBe(0);
  });

  it('pushbuild: an unmatched county label throws', () => {
    const bad = fx('pushbuild-sample.csv').replace('Dewitt', 'Dee Witt');
    expect(() => pushbuildAdapter(bad, [mapRow({})], xw)).toThrow(/Unmatched geography label "Dee Witt"/);
  });

  it('pushbuild: a non-numeric vote value throws', () => {
    const bad = fx('pushbuild-sample.csv').replace(',100,', ',1x0,');
    expect(() => pushbuildAdapter(bad, [mapRow({})], xw)).toThrow(/Bad vote value/);
  });

  it('tlc: parses party letters and sums VTDs by the first three digits of CNTYVTD', () => {
    const m = mapRow({ source_id: 'tlc-2024', source_contest: 'President' });
    const res = tlcAdapter(fx('tlc-sample.csv'), m, xw);
    expect(res.statewide).toEqual([]);
    const get = (u: string, c: string) => res.rows.find((r) => r.unit_id === u && r.candidate === c)!;
    expect(get('48001', 'Alpha')).toMatchObject({ party: 'D', votes: 15 });
    expect(get('48001', 'Beta')).toMatchObject({ party: 'R', votes: 26 });
    expect(get('48003', 'Write-In')).toMatchObject({ party: 'W', votes: 2 });
    const race = buildRace(R, ['48001', '48003'], res.rows);
    expect(race.candidates.map((c) => c.name)).toEqual(['Alpha', 'Beta']);
    expect(race.other_votes).toEqual([1, 2]);
  });

  it('tlc: a VTD in an unknown county or an unexpected column throws', () => {
    const m = mapRow({ source_id: 'tlc-2024', source_contest: 'President' });
    expect(() => tlcAdapter(fx('tlc-sample.csv').replace('"0030001"', '"9990001"'), m, xw)).toThrow(/Unmatched/);
    expect(() => tlcAdapter(fx('tlc-sample.csv'), { ...m, source_contest: 'Senate' }, xw)).toThrow(/Unrecognized/);
  });
});

describe('validation', () => {
  const units = ['48001'];
  const mk = (a: number, b: number) => buildRace(R, units, [row('48001', 'A', 'DEM', a), row('48001', 'B', 'REP', b)]);
  const state = (a: number, b: number) =>
    buildRace(R, [STATEWIDE_UNIT], [row(STATEWIDE_UNIT, 'A', 'DEM', a), row(STATEWIDE_UNIT, 'B', 'REP', b)]);
  const ref = (cand: string, votes: number) => ({
    race_id: R,
    candidate_match: cand,
    votes: String(votes),
    total_votes: '0',
    status: 'certified',
    source_url: '',
    retrieved: '',
    note: '',
  });

  it('tier 1 allows max(50, 0.10%) and fails beyond it', () => {
    expect(() => tier1(mk(10_000, 5_000), state(10_050, 5_000))).not.toThrow();
    expect(() => tier1(mk(10_000, 5_000), state(10_051, 5_000))).toThrow(/Tier 1/);
  });

  it('tier 1 uses the percentage once it exceeds 50 votes', () => {
    expect(() => tier1(mk(10_000_000, 5_000), state(10_009_000, 5_000))).not.toThrow();
    expect(() => tier1(mk(10_000_000, 5_000), state(10_011_000, 5_000))).toThrow(/Tier 1/);
  });

  it('tier 2 allows max(50, 0.05%) and fails beyond it', () => {
    expect(() => tier2(mk(1_000_000, 500_000), [ref('A', 1_000_400), ref('B', 500_000)])).not.toThrow();
    expect(() => tier2(mk(1_000_000, 500_000), [ref('A', 1_000_600), ref('B', 500_000)])).toThrow(/Tier 2/);
  });

  it('tier 2 needs exactly one reference row per checked candidate', () => {
    expect(() => tier2(mk(100, 50), [ref('A', 100)])).toThrow(/0 reference rows match B/);
    expect(() => tier2(mk(100, 50), [ref('A', 100), ref('A', 100), ref('B', 50)])).toThrow(/2 reference rows/);
    expect(() => tier2(mk(100, 50), [])).toThrow(/no rows/);
  });

  it('assertChecks reports zero for an empty list', () => {
    expect(assertChecks('x', [])).toBe(0);
  });
});
