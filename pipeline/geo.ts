import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import mapshaper from 'mapshaper';
import { CENSUS_FILE, latestCensusSnapshot } from './fetch/census.ts';
import { verifySnapshot } from './lib/hash.ts';

export const GEO_VERSION = '2025c';
/** The 50 states and DC. Territories in the Census file are excluded. */
export const STATE_POS = [
  'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS',
  'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV',
  'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY',
];

export type UnitKind = 'county' | 'independent_city' | 'planning_region';

export interface Unit {
  unit_id: string;
  state_po: string;
  name: string;
  kind: UnitKind;
  geo_key: string;
  valid_from: string;
  valid_to: string;
}

/** Kind by rule: Census LSAD 25 = city that is a county equivalent; LSAD PL = CT planning region. */
export function kindFor(lsad: string): UnitKind {
  if (lsad === '25') return 'independent_city';
  if (lsad === 'PL') return 'planning_region';
  return 'county';
}

const COLUMNS = ['unit_id', 'state_po', 'name', 'kind', 'geo_key', 'valid_from', 'valid_to'] as const;

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function unitsToCsv(units: Unit[]): string {
  const lines: string[] = [COLUMNS.join(',')];
  for (const u of units) lines.push(COLUMNS.map((c) => csvCell(u[c])).join(','));
  return lines.join('\n') + '\n';
}

export function parseUnitsCsv(text: string): Unit[] {
  return parse(text, { columns: true, skip_empty_lines: true }) as Unit[];
}

async function runZip(zipPath: string, commands: string, outName: string): Promise<string> {
  const out = await mapshaper.applyCommands(commands, { 'in.zip': readFileSync(zipPath) });
  return String(out[outName]);
}

export interface GeoOutputs {
  unitsCsv: string;
  unitsJson: string;
  txTopo: string;
}

export async function buildGeo(rawRoot: string): Promise<GeoOutputs> {
  const snap = latestCensusSnapshot(rawRoot);
  const problems = verifySnapshot(snap);
  if (problems.length > 0) throw new Error(`Raw integrity failed:\n${problems.join('\n')}`);
  const zip = join(snap, CENSUS_FILE);

  const attrs = parse(await runZip(zip, '-i in.zip -o format=csv out.csv', 'out.csv'), {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
  const states = new Set(STATE_POS);
  const units: Unit[] = attrs
    .filter((r) => states.has(r.STUSPS!))
    .map((r) => ({
      unit_id: r.GEOID!,
      state_po: r.STUSPS!,
      name: r.NAME!,
      kind: kindFor(r.LSAD!),
      geo_key: r.GEOID!,
      valid_from: GEO_VERSION,
      valid_to: '',
    }))
    .sort((a, b) => (a.unit_id < b.unit_id ? -1 : a.unit_id > b.unit_id ? 1 : 0));

  // Unprojected, topology-preserving simplification, quantized; geometry id = GEOID.
  const txTopo = await runZip(
    zip,
    `-i in.zip -filter "STATEFP == '48'" -filter-fields GEOID ` +
      `-simplify visvalingam weighted 15% keep-shapes -rename-layers counties ` +
      `-o format=topojson quantization=10000 id-field=GEOID out.json`,
    'out.json',
  );

  return {
    unitsCsv: unitsToCsv(units),
    unitsJson: JSON.stringify(units) + '\n',
    txTopo: JSON.stringify(JSON.parse(txTopo)) + '\n',
  };
}

export function writeGeo(root: string, g: GeoOutputs): void {
  mkdirSync(join(root, 'data/crosswalk'), { recursive: true });
  mkdirSync(join(root, 'public/data/v1/geo/states'), { recursive: true });
  writeFileSync(join(root, 'data/crosswalk/units.csv'), g.unitsCsv);
  writeFileSync(join(root, 'public/data/v1/units.json'), g.unitsJson);
  writeFileSync(join(root, 'public/data/v1/geo/states/TX.topo.json'), g.txTopo);
}
