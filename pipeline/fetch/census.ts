import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256, type SourceJson } from '../lib/hash.ts';

export const CENSUS_SOURCE_ID = 'census-cb';
export const CENSUS_FILE = 'cb_2025_us_county_5m.zip';
export const CENSUS_URL = `https://www2.census.gov/geo/tiger/GENZ2025/shp/${CENSUS_FILE}`;

/** Download the county file into a new dated snapshot. Never touches an existing snapshot. */
export async function fetchCensus(rawRoot: string, today: string): Promise<string> {
  const dir = join(rawRoot, CENSUS_SOURCE_ID, today);
  if (existsSync(dir)) {
    throw new Error(`Snapshot ${dir} already exists. Raw snapshots are immutable; use a new date.`);
  }
  const res = await fetch(CENSUS_URL);
  if (!res.ok) throw new Error(`GET ${CENSUS_URL} -> HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, CENSUS_FILE), buf);
  const source: SourceJson = {
    source_id: CENSUS_SOURCE_ID,
    snapshot: today,
    retrieved_at: new Date().toISOString(),
    method: 'scripted',
    urls: [CENSUS_URL],
    upstream_commit: null,
    license: 'Public domain (U.S. Census Bureau work); not confirmed in writing',
    files: [{ path: CENSUS_FILE, sha256: sha256(buf), bytes: buf.length }],
    notes: 'Cartographic boundary county file, 1:5,000,000, vintage 2025.',
  };
  writeFileSync(join(dir, 'SOURCE.json'), JSON.stringify(source, null, 2) + '\n');
  return dir;
}

/** Latest snapshot directory for the Census source, by date name. */
export function latestCensusSnapshot(rawRoot: string): string {
  const base = join(rawRoot, CENSUS_SOURCE_ID);
  const snaps = existsSync(base) ? readdirSync(base).sort() : [];
  const last = snaps[snaps.length - 1];
  if (last === undefined) throw new Error(`No snapshot in ${base}. Run npm run data:fetch:census.`);
  return join(base, last);
}
