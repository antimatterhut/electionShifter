import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { describe, expect, it } from 'vitest';
import { assertComplete } from '../../pipeline/validate.ts';
import type { RaceFile, RaceMapRow } from '../../pipeline/types.ts';
import { metricValue, type ViewSpec } from '../../src/domain/view.ts';
import type { RaceFile as DomainRace } from '../../src/domain/types.ts';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const manifest = JSON.parse(read('public/data/v1/manifest.json')) as {
  races: { race_id: string; year: number; office: string; status: string; file: string; validation: { tier1: string; tier2: string } }[];
};
const race = (id: string) =>
  JSON.parse(read(`public/data/v1/${manifest.races.find((r) => r.race_id === id)!.file}`)) as RaceFile;
const sum = (c: (number | null)[]) => c.reduce<number>((s, v) => s + v!, 0);
const idx = (r: RaceFile, name: string) => r.candidates.findIndex((c) => c.name.toUpperCase().includes(name));
const cell = (r: RaceFile, name: string, unit: string) => r.votes[idx(r, name)]![r.units.indexOf(unit)]!;
const ids = manifest.races.map((r) => r.race_id);

const WANTED_2026 = [
  'us-senate',
  'governor',
  'lt-governor',
  'attorney-general',
  'comptroller',
  'land-commissioner',
  'agriculture-commissioner',
  'railroad-commissioner',
];
const WANTED_2024 = ['president', 'us-senate', 'railroad-commissioner'];

describe('Texas statewide races (Phase 7)', () => {
  it('has every statewide executive office for 2026 and the 2024 statewide offices', () => {
    for (const o of WANTED_2026) expect(ids, o).toContain(`2026-TX-${o}-gen`);
    for (const o of WANTED_2024) expect(ids, o).toContain(`2024-TX-${o}-gen`);
  });

  it('has the statewide judicial races for both years', () => {
    const offices = (y: number) => new Set(manifest.races.filter((r) => r.year === y).map((r) => r.office));
    for (const y of [2024, 2026]) {
      expect(offices(y).has('supreme-court'), `${y} supreme court`).toBe(true);
      expect(offices(y).has('court-of-criminal-appeals'), `${y} CCA`).toBe(true);
    }
    expect(offices(2026).has('fifteenth-court-of-appeals')).toBe(true);
  });

  it('every race has 254 complete county rows and a D and an R candidate', () => {
    for (const id of ids) {
      const r = race(id);
      expect(r.units, id).toHaveLength(254);
      expect(() => assertComplete(r), id).not.toThrow();
      const groups = r.candidates.map((c) => c.group);
      expect(groups, id).toContain('D');
      expect(groups, id).toContain('R');
    }
  });

  it('contains no district-level contests (only race_map.csv rows are built)', () => {
    const map = parse(read('data/overrides/race_map.csv'), { columns: true }) as RaceMapRow[];
    expect(map.map((m) => m.race_id).sort()).toEqual(ids);
    for (const m of map) expect(m.source_contest).not.toMatch(/REPRESENTATIVE|COUNTY|STATE SENATOR|DISTRICT ATTORNEY/);
    // Statewide contests have millions of votes; a district contest could not.
    for (const id of ids) expect(sum(race(id).total_votes), id).toBeGreaterThan(5_000_000);
  });

  it('every 2026 race passed Tier 1 against the feed statewide rows', () => {
    for (const r of manifest.races.filter((x) => x.year === 2026)) expect(r.validation.tier1, r.race_id).toBe('pass');
  });

  it('a race is certified only with a passing Tier 2 check', () => {
    for (const r of manifest.races) if (r.status === 'certified') expect(r.validation.tier2, r.race_id).toBe('pass');
    expect(manifest.races.find((r) => r.race_id === '2024-TX-us-senate-gen')!.status).toBe('certified');
    // No independent total exists for these yet, so they must not claim certification.
    expect(manifest.races.find((r) => r.race_id === '2024-TX-railroad-commissioner-gen')!.status).toBe('unofficial');
  });

  it('2026 statewide totals match the feed (Governor 9,907,381; Railroad Commissioner 9,717,302)', () => {
    expect(sum(race('2026-TX-governor-gen').total_votes)).toBe(9_907_381);
    expect(sum(race('2026-TX-railroad-commissioner-gen').total_votes)).toBe(9_717_302);
  });
});

describe('cross-race comparisons from real data', () => {
  const spec = (metric: ViewSpec['metric'], extra: Partial<ViewSpec> = {}): ViewSpec => ({
    metric,
    basis: 'total',
    which: 'B',
    candA: null,
    candB: null,
    ...extra,
  });
  const val = (s: ViewSpec, a: string, b: string, unit: string) =>
    metricValue(s, race(a) as unknown as DomainRace, race(b) as unknown as DomainRace, unit);
  const COLLIN = '48085';

  it('Governor vs Senate (ticket splitting), Collin: margin +4.46 vs +12.09, raw shift +34,839', () => {
    const gov = '2026-TX-governor-gen';
    const sen = '2026-TX-us-senate-gen';
    expect(cell(race(gov), 'HINOJOSA', COLLIN) - cell(race(gov), 'ABBOTT', COLLIN)).toBe(20_468);
    expect(cell(race(sen), 'TALARICO', COLLIN) - cell(race(sen), 'PAXTON', COLLIN)).toBe(55_307);
    expect(val(spec('raw_shift'), gov, sen, COLLIN).value).toBe(34_839);
    const swing = val(spec('margin_swing'), gov, sen, COLLIN).value!;
    expect(swing).toBeCloseTo((55_307 / 457_641 - 20_468 / 458_597) * 100, 6);
    expect(swing).toBeGreaterThan(7);
  });

  it('Railroad Commissioner vs Senate, 2026: margin and raw vote metrics are defined in every county', () => {
    const rrc = '2026-TX-railroad-commissioner-gen';
    const sen = '2026-TX-us-senate-gen';
    for (const metric of ['margin_swing', 'raw_shift', 'raw_margin', 'margin'] as const) {
      for (const u of race(rrc).units) {
        expect(val(spec(metric), rrc, sen, u).value, `${metric} ${u}`).not.toBeNull();
      }
    }
    // Collin: Senate raw margin 55,307; Railroad Commissioner raw margin 24,091.
    expect(val(spec('raw_margin', { which: 'A' }), rrc, sen, COLLIN).value).toBe(232_026 - 207_935);
    expect(val(spec('raw_shift'), rrc, sen, COLLIN).value).toBe(55_307 - 24_091);
  });

  it('French vs Paxton: candidate raw change is source-derived, Collin -10,839', () => {
    const rrc = race('2026-TX-railroad-commissioner-gen');
    const sen = race('2026-TX-us-senate-gen');
    const french = rrc.candidates[idx(rrc, 'FRENCH')]!.candidate_id;
    const paxton = sen.candidates[idx(sen, 'PAXTON')]!.candidate_id;
    const v = val(
      spec('candidate_change_raw', { candA: french, candB: paxton }),
      '2026-TX-railroad-commissioner-gen',
      '2026-TX-us-senate-gen',
      COLLIN,
    );
    expect(v.value).toBe(197_096 - 207_935);
  });

  it('2024 Railroad Commissioner vs 2026 Railroad Commissioner is comparable by margin swing', () => {
    expect(val(spec('margin_swing'), '2024-TX-railroad-commissioner-gen', '2026-TX-railroad-commissioner-gen', COLLIN).value).not.toBeNull();
  });
});
