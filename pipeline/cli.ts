import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCensus } from './fetch/census.ts';
import { buildGeo, writeGeo } from './geo.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const rawRoot = join(root, 'data/raw');

const cmd = process.argv[2];
if (cmd === 'fetch-census') {
  const today = process.argv[3] ?? new Date().toISOString().slice(0, 10);
  console.log('Wrote snapshot', await fetchCensus(rawRoot, today));
} else if (cmd === 'build') {
  writeGeo(root, await buildGeo(rawRoot));
  console.log('Built units.csv, units.json, TX.topo.json');
} else {
  console.error('usage: node pipeline/cli.ts <fetch-census [YYYY-MM-DD] | build>');
  process.exit(1);
}
