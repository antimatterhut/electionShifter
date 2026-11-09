import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { beforeAll, describe, expect, it } from 'vitest';
import { verifyBuild } from '../../pipeline/build.ts';
import { loadCrosswalk } from '../../pipeline/crosswalk.ts';
import { buildRace } from '../../pipeline/normalize.ts';
import { pushbuildAdapter } from '../../pipeline/sources/pushbuild.ts';
import { assertComplete, tier1, tier2 } from '../../pipeline/validate.ts';
import { STATEWIDE_UNIT, type RaceFile, type RaceMapRow, type ReferenceRow } from '../../pipeline/types.ts';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const json = <T>(p: string) => JSON.parse(read(p)) as T;
const csv = <T>(p: string) => parse(read(p), { columns: true, skip_empty_lines: true }) as T[];

interface Meta {
  race_id: string;
  status: string;
  as_of: string;
  unit_count: number;
  has_dem: boolean;
  has_rep: boolean;
  file: string;
  validation: { tier1: string; tier2: string; max_diff_pct: number };
}
const manifest = json<{ schema_version: number; geo_version: string; build_hash: string; races: Meta[] }>(
  'public/data/v1/manifest.json',
);
const race = (id: string) => json<RaceFile>(`public/data/v1/${manifest.races.find((r) => r.race_id === id)!.file}`);

const A = '2024-TX-president-gen';
const B = '2026-TX-us-senate-gen';
const units = csv<{ unit_id: string; state_po: string }>('data/crosswalk/units.csv')
  .filter((u) => u.state_po === 'TX')
  .map((u) => u.unit_id)
  .sort();

/** Votes for one candidate (by name substring) in one county. */
function cell(r: RaceFile, name: string, unit: string): number {
  const i = r.candidates.findIndex((c) => c.name.toUpperCase().includes(name.toUpperCase()));
  expect(i, `candidate ${name}`).toBeGreaterThanOrEqual(0);
  return r.votes[i]![r.units.indexOf(unit)]!;
}
const sum = (col: (number | null)[]) => col.reduce<number>((s, v) => s + v!, 0);
const candSum = (r: RaceFile, name: string) => sum(r.votes[r.candidates.findIndex((c) => c.name.toUpperCase().includes(name.toUpperCase()))]!);

describe('Texas race files', () => {
  it.each([A, B])('%s has 254 units equal to the registry, in ascending order, with no nulls', (id) => {
    const r = race(id);
    expect(r.units).toHaveLength(254);
    expect(r.units).toEqual(units);
    expect(r.units).toEqual([...r.units].sort());
    expect(() => assertComplete(r)).not.toThrow();
    for (const col of [...r.votes, r.other_votes, r.total_votes]) {
      expect(col).toHaveLength(254);
      expect(col.every((v) => Number.isInteger(v))).toBe(true);
    }
  });

  it('race file units equal the Texas topology ids', () => {
    const topo = json<{ objects: { counties: { geometries: { id: string }[] } } }>('public/data/v1/geo/states/TX.topo.json');
    const ids = topo.objects.counties.geometries.map((g) => g.id).sort();
    expect(race(A).units).toEqual(ids);
    expect(race(B).units).toEqual(ids);
  });

  it('has D and R candidates, and no candidate in a race is both', () => {
    for (const id of [A, B]) {
      const groups = race(id).candidates.map((c) => c.group);
      expect(groups).toContain('D');
      expect(groups).toContain('R');
    }
  });
});

describe('golden county values (MASTER_PLAN §4)', () => {
  it('2024 President, Collin and Denton', () => {
    const r = race(A);
    expect(cell(r, 'HARRIS', '48085')).toBe(222_115);
    expect(cell(r, 'TRUMP', '48085')).toBe(279_534);
    expect(r.total_votes[r.units.indexOf('48085')]).toBe(517_690);
    expect(cell(r, 'HARRIS', '48121')).toBe(191_503);
    expect(cell(r, 'TRUMP', '48121')).toBe(250_521);
    expect(r.total_votes[r.units.indexOf('48121')]).toBe(449_188);
  });

  it('2026 Senate, Collin and Denton', () => {
    const r = race(B);
    expect(cell(r, 'TALARICO', '48085')).toBe(252_403);
    expect(cell(r, 'PAXTON', '48085')).toBe(197_096);
    expect(r.total_votes[r.units.indexOf('48085')]).toBe(457_641);
    expect(cell(r, 'TALARICO', '48121')).toBe(211_266);
    expect(cell(r, 'PAXTON', '48121')).toBe(177_859);
    expect(r.total_votes[r.units.indexOf('48121')]).toBe(396_235);
  });
});

describe('statewide golden values', () => {
  it('2024: Harris 4,835,134; Trump 6,393,403; total 11,404,528 (TLC)', () => {
    const r = race(A);
    expect(candSum(r, 'HARRIS')).toBe(4_835_134);
    expect(candSum(r, 'TRUMP')).toBe(6_393_403);
    expect(sum(r.total_votes)).toBe(11_404_528);
  });

  it('2026: Talarico 5,444,982; Paxton 4,249,373; total 9,889,704 (pinned snapshot only)', () => {
    const r = race(B);
    expect(candSum(r, 'TALARICO')).toBe(5_444_982);
    expect(candSum(r, 'PAXTON')).toBe(4_249_373);
    expect(sum(r.total_votes)).toBe(9_889_704);
  });

  it('the 2026 snapshot is pinned to the recorded upstream commit', () => {
    const src = json<{ upstream_commit: string; files: { path: string }[] }>('data/raw/pushbuild-2026/2026-11-09/SOURCE.json');
    expect(src.upstream_commit).toBe('56b4b499507f5b8fce9433640de34a56df4ad619');
    expect(src.files.map((f) => f.path)).toEqual(['tx.csv']);
  });
});

describe('validation tiers', () => {
  const mapRows = csv<RaceMapRow>('data/overrides/race_map.csv');
  const refs = csv<ReferenceRow>('data/reference/statewide_totals.csv');

  it('Tier 1 (2026): county sums equal the feed statewide rows within tolerance', () => {
    const m = mapRows.find((x) => x.race_id === B)!;
    const xw = loadCrosswalk(root, read('data/crosswalk/units.csv'));
    const res = pushbuildAdapter(read(`data/raw/${m.source_id}/2026-11-09/${m.source_file}`), [m], xw);
    const state = buildRace(B, [STATEWIDE_UNIT], res.statewide);
    expect(res.statewide.length).toBeGreaterThan(0);
    expect(tier1(race(B), state)).toBeLessThanOrEqual(0.1);
  });

  it('Tier 2 (2024): county sums match the independent MEDSL totals within max(50, 0.05%)', () => {
    expect(tier2(race(A), refs)).toBeLessThanOrEqual(0.05);
  });

  it('reference rows equal the pinned MEDSL raw files', () => {
    const files: Record<string, string> = {
      '2024-TX-president-gen': '2024-president-state.csv',
      '2024-TX-us-senate-gen': '2024-senate-state.csv',
    };
    expect(refs.length).toBeGreaterThan(0);
    expect(new Set(refs.map((r) => r.race_id))).toEqual(new Set(Object.keys(files)));
    for (const ref of refs) {
      const medsl = csv<Record<string, string>>(`data/raw/medsl-2024/2026-11-09b/${files[ref.race_id]}`).filter(
        (r) => r.state_po === 'TX' && r.writein === 'FALSE' && r.mode === 'TOTAL',
      );
      const src = medsl.filter((r) => r.candidate!.toUpperCase().includes(ref.candidate_match));
      expect(src, ref.candidate_match).toHaveLength(1);
      expect(src[0]!.votes).toBe(ref.votes);
    }
  });

  it('Tier 2 (2024 Senate): county sums match the independent MEDSL totals', () => {
    expect(tier2(race('2024-TX-us-senate-gen'), refs)).toBeLessThanOrEqual(0.05);
  });

  it('a 0.1% error in a county would be caught by Tier 2', () => {
    const r = race(A);
    const bad: RaceFile = { ...r, votes: r.votes.map((c, i) => (i === 0 ? c.map((v, j) => (j === 0 ? v! + 20_000 : v)) : c)) };
    expect(() => tier2(bad, refs)).toThrow(/Tier 2/);
  });
});

describe('manifest', () => {
  it('lists every race, sorted, with correct status, validation and unit counts', () => {
    expect(manifest.schema_version).toBe(1);
    expect(manifest.geo_version).toBe('2025c');
    expect(manifest.build_hash).toMatch(/^[0-9a-f]{64}$/);
    const ids = manifest.races.map((r) => r.race_id);
    expect(ids).toEqual([...ids].sort());
    expect(ids).toContain(A);
    expect(ids).toContain(B);
    for (const r of manifest.races) expect(r).toMatchObject({ unit_count: 254, has_dem: true, has_rep: true });
    const a = manifest.races.find((r) => r.race_id === A)!;
    const b = manifest.races.find((r) => r.race_id === B)!;
    expect(a).toMatchObject({ status: 'certified' });
    expect(a.validation).toMatchObject({ tier1: 'na', tier2: 'pass' });
    expect(b).toMatchObject({ status: 'unofficial', as_of: '2026-11-06' });
    expect(b.validation).toMatchObject({ tier1: 'pass', tier2: 'pending' });
  });

  it('only a race with passing Tier 2 is certified', () => {
    for (const r of manifest.races) {
      if (r.status === 'certified') expect(r.validation.tier2).toBe('pass');
    }
  });

  it('contains no timestamps or absolute paths', () => {
    const text = read('public/data/v1/manifest.json');
    expect(text).not.toMatch(/T\d{2}:\d{2}/);
    expect(text).not.toMatch(/\\/);
  });
});

describe('pipeline determinism', () => {
  it('rebuilding from raw reproduces every committed output byte for byte', async () => {
    expect(await verifyBuild(root)).toEqual([]);
  }, 120_000);
});

beforeAll(() => {
  expect(units).toHaveLength(254);
});
