import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGeo, parseUnitsCsv, STATE_POS } from '../../pipeline/geo.ts';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const units = parseUnitsCsv(read('data/crosswalk/units.csv'));
const topo = JSON.parse(read('public/data/v1/geo/states/TX.topo.json'));
const topoIds: string[] = topo.objects.counties.geometries.map((g: { id: string }) => g.id);

describe('unit registry', () => {
  it('covers all 50 states and DC', () => {
    expect([...new Set(units.map((u) => u.state_po))].sort()).toEqual([...STATE_POS].sort());
  });

  it('has unique 5-digit unit ids and geo keys', () => {
    expect(new Set(units.map((u) => u.unit_id)).size).toBe(units.length);
    for (const u of units) {
      expect(u.unit_id).toMatch(/^\d{5}$/);
      expect(u.geo_key).toBe(u.unit_id);
    }
  });

  it('has 254 Texas units, all 48xxx', () => {
    const tx = units.filter((u) => u.state_po === 'TX');
    expect(tx).toHaveLength(254);
    for (const u of tx) expect(u.unit_id).toMatch(/^48\d{3}$/);
  });

  it('has exactly 9 Connecticut planning regions, none of the old counties', () => {
    const ct = units.filter((u) => u.state_po === 'CT');
    expect(ct.map((u) => u.unit_id).sort()).toEqual(
      ['09110', '09120', '09130', '09140', '09150', '09160', '09170', '09180', '09190'],
    );
    expect(ct.every((u) => u.kind === 'planning_region')).toBe(true);
    expect(ct.some((u) => /^090(0[1-9]|1[0-5])$/.test(u.unit_id))).toBe(false);
  });

  it('marks Virginia independent cities and keeps Doña Ana accented', () => {
    expect(units.find((u) => u.unit_id === '51510')?.kind).toBe('independent_city');
    expect(units.find((u) => u.unit_id === '35013')?.name).toBe('Doña Ana');
  });

  it('public units.json matches units.csv', () => {
    expect(JSON.parse(read('public/data/v1/units.json'))).toEqual(units);
  });

  it('aliases point at registered units', () => {
    const ids = new Set(units.map((u) => u.unit_id));
    const rows = read('data/crosswalk/aliases.csv').trim().split('\n').slice(1);
    for (const r of rows) expect(ids.has(r.split(',')[3]!)).toBe(true);
  });
});

describe('Texas topology', () => {
  it('ids equal the registry TX units', () => {
    const reg = units.filter((u) => u.state_po === 'TX').map((u) => u.unit_id).sort();
    expect([...topoIds].sort()).toEqual(reg);
    expect(topoIds.every((id) => /^48\d{3}$/.test(id))).toBe(true);
  });

  it('is unprojected (lon/lat) and under 400 KB', () => {
    const [sx, sy] = topo.transform.scale as number[];
    const [tx, ty] = topo.transform.translate as number[];
    expect(tx).toBeGreaterThan(-110);
    expect(tx).toBeLessThan(-93);
    expect(ty).toBeGreaterThan(25);
    expect(ty).toBeLessThan(37);
    expect(sx).toBeLessThan(1);
    expect(sy).toBeLessThan(1);
    expect(Buffer.byteLength(read('public/data/v1/geo/states/TX.topo.json'))).toBeLessThan(400 * 1024);
  });
});

describe('determinism', () => {
  it('building twice gives identical bytes, equal to the committed outputs', async () => {
    const a = await buildGeo(join(root, 'data/raw'));
    const b = await buildGeo(join(root, 'data/raw'));
    expect(a).toEqual(b);
    expect(a.unitsCsv).toBe(read('data/crosswalk/units.csv'));
    expect(a.unitsJson).toBe(read('public/data/v1/units.json'));
    expect(a.txTopo).toBe(read('public/data/v1/geo/states/TX.topo.json'));
  }, 60000);
});
