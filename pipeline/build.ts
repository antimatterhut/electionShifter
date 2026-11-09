import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { parse } from 'csv-parse/sync';
import { loadCrosswalk } from './crosswalk.ts';
import { MEDSL_PINNED_SHA, MEDSL_SOURCE_ID, MEDSL_REPO } from './fetch/medsl.ts';
import { buildGeo, GEO_VERSION } from './geo.ts';
import { sha256, verifySnapshot } from './lib/hash.ts';
import { latestSnapshot } from './lib/snapshot.ts';
import { buildRace } from './normalize.ts';
import { medslReference, REFERENCE_COLUMNS } from './sources/medsl.ts';
import { pushbuildAdapter } from './sources/pushbuild.ts';
import { tlcAdapter } from './sources/tlc.ts';
import { STATEWIDE_UNIT, type AdapterResult, type RaceFile, type RaceMapRow, type ReferenceRow } from './types.ts';
import { assertComplete, tier1, tier2 } from './validate.ts';

const V1 = 'public/data/v1';

function readCsv<T>(path: string): T[] {
  return parse(readFileSync(path, 'utf8'), { columns: true, skip_empty_lines: true }) as T[];
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Latest snapshot for a source, with its hashes re-verified. */
function snapshotFor(root: string, sourceId: string): string {
  const dir = latestSnapshot(join(root, 'data/raw'), sourceId);
  const problems = verifySnapshot(dir);
  if (problems.length > 0) throw new Error(`Raw integrity failed:\n${problems.join('\n')}`);
  return dir;
}

export function referencePath(root: string): string {
  return join(root, 'data/reference/statewide_totals.csv');
}

/** Regenerate the Tier 2 reference file for 2024 President from the pinned MEDSL snapshot. */
export function writeReference(root: string): string {
  const map = readCsv<RaceMapRow>(join(root, 'data/overrides/race_map.csv')).find((m) => m.race_id === '2024-TX-president-gen');
  if (map === undefined) throw new Error('2024-TX-president-gen missing from race_map.csv');
  const dir = snapshotFor(root, MEDSL_SOURCE_ID);
  const snapshot = dir.split(/[\\/]/).pop()!;
  const rows = medslReference(readFileSync(join(dir, '2024-president-state.csv'), 'utf8'), {
    race_id: map.race_id,
    state_po: map.state_po,
    office: 'US PRESIDENT',
    source_url: `https://github.com/${MEDSL_REPO}/blob/${MEDSL_PINNED_SHA}/2024-president-state.csv`,
    retrieved: snapshot,
    commit: MEDSL_PINNED_SHA,
  });
  const lines = [REFERENCE_COLUMNS.join(',')];
  for (const r of rows) lines.push(REFERENCE_COLUMNS.map((c) => csvCell(r[c])).join(','));
  const out = referencePath(root);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join('\n') + '\n');
  return out;
}

const stable = (n: number) => Number(n.toFixed(4));

/** Rebuild every generated file in memory. Keys are repo-relative paths with forward slashes. */
export async function buildAll(root: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const geo = await buildGeo(join(root, 'data/raw'));
  out.set('data/crosswalk/units.csv', geo.unitsCsv);
  out.set(`${V1}/units.json`, geo.unitsJson);
  out.set(`${V1}/geo/states/TX.topo.json`, geo.txTopo);

  const xw = loadCrosswalk(root, geo.unitsCsv);
  const mapPath = join(root, 'data/overrides/race_map.csv');
  const map = readCsv<RaceMapRow>(mapPath);
  const refs = readCsv<ReferenceRow>(referencePath(root));

  const hashInputs: string[] = [
    `units.csv:${sha256(geo.unitsCsv)}`,
    `race_map.csv:${sha256(readFileSync(mapPath))}`,
    `statewide_totals.csv:${sha256(readFileSync(referencePath(root)))}`,
    `aliases.csv:${sha256(readFileSync(join(root, 'data/crosswalk/aliases.csv')))}`,
    `census:${sha256(readFileSync(join(snapshotFor(root, 'census-cb'), 'SOURCE.json')))}`,
  ];
  const seenSnapshots = new Set<string>();

  const metas: Record<string, unknown>[] = [];
  const coverage: Record<string, unknown>[] = [];
  for (const m of [...map].sort((a, b) => (a.race_id < b.race_id ? -1 : 1))) {
    const dir = snapshotFor(root, m.source_id);
    if (!seenSnapshots.has(dir)) {
      seenSnapshots.add(dir);
      hashInputs.push(`${m.source_id}:${sha256(readFileSync(join(dir, 'SOURCE.json')))}`);
    }
    const text = readFileSync(join(dir, m.source_file), 'utf8');
    let res: AdapterResult;
    if (m.source_id.startsWith('pushbuild')) res = pushbuildAdapter(text, [m], xw);
    else if (m.source_id.startsWith('tlc')) res = tlcAdapter(text, m, xw);
    else throw new Error(`No adapter for source ${m.source_id}`);

    const units = xw.stateUnits(m.state_po);
    const race: RaceFile = buildRace(m.race_id, units, res.rows);
    assertComplete(race);

    let t1: 'pass' | 'na' = 'na';
    let t2: 'pass' | 'pending' = 'pending';
    let maxDiff = 0;
    if (res.statewide.length > 0) {
      maxDiff = Math.max(maxDiff, tier1(race, buildRace(m.race_id, [STATEWIDE_UNIT], res.statewide)));
      t1 = 'pass';
    }
    if (m.status === 'certified') {
      maxDiff = Math.max(maxDiff, tier2(race, refs));
      t2 = 'pass';
    }

    const file = `races/${m.year}/${m.state_po}/${m.race_id}.json`;
    out.set(`${V1}/${file}`, JSON.stringify(race) + '\n');
    metas.push({
      race_id: m.race_id,
      year: Number(m.year),
      election_date: m.election_date,
      state_po: m.state_po,
      office: m.office,
      office_label: m.office_label,
      seat: m.seat === '' ? null : m.seat,
      stage: m.stage,
      status: m.status,
      as_of: m.as_of,
      source_ids: [m.source_id],
      source_label: m.source_label,
      file,
      unit_count: units.length,
      has_dem: race.candidates.some((c) => c.group === 'D'),
      has_rep: race.candidates.some((c) => c.group === 'R'),
      method_note: m.method_note === '' ? null : m.method_note,
      validation: { tier1: t1, tier2: t2, max_diff_pct: stable(maxDiff) },
    });
    coverage.push({ year: Number(m.year), state_po: m.state_po, office: m.office, state: 'ok', note: '' });
  }
  const manifest = {
    schema_version: 1,
    geo_version: GEO_VERSION,
    build_hash: sha256([...hashInputs].sort().join('\n')),
    races: metas,
    coverage,
  };
  out.set(`${V1}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  return out;
}

export function writeAll(root: string, files: Map<string, string>): void {
  for (const [rel, text] of files) {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split('\\').join('/'));
    }
  };
  walk(dir);
  return out;
}

/** Rebuild into a temp dir and byte-compare with the committed outputs. Returns problems. */
export async function verifyBuild(root: string): Promise<string[]> {
  const files = await buildAll(root);
  const tmp = mkdtempSync(join(tmpdir(), 'es-verify-'));
  const problems: string[] = [];
  try {
    writeAll(tmp, files);
    for (const rel of files.keys()) {
      let want: Buffer;
      try {
        want = readFileSync(join(root, rel));
      } catch {
        problems.push(`${rel}: missing from the repo; run npm run data:build`);
        continue;
      }
      if (!want.equals(readFileSync(join(tmp, rel)))) problems.push(`${rel}: differs from a fresh rebuild`);
    }
    const expected = new Set([...files.keys()].filter((k) => k.startsWith(`${V1}/`)).map((k) => k.slice(V1.length + 1)));
    for (const f of listFiles(join(root, V1))) {
      if (!expected.has(f)) problems.push(`${V1}/${f}: not produced by the pipeline (stale or hand-made)`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return problems;
}

