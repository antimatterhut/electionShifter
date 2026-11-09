import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256, type SourceJson } from './hash.ts';

export interface FetchedFile {
  name: string;
  url: string;
  data: Uint8Array;
}

export async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Write a new immutable snapshot with SOURCE.json. Refuses to touch an existing one. */
export function writeSnapshot(
  rawRoot: string,
  meta: {
    source_id: string;
    snapshot: string;
    upstream_commit: string | null;
    license: string;
    notes: string;
  },
  files: FetchedFile[],
): string {
  const dir = join(rawRoot, meta.source_id, meta.snapshot);
  if (existsSync(dir)) {
    throw new Error(`Snapshot ${dir} already exists. Raw snapshots are immutable; use a new date.`);
  }
  mkdirSync(dir, { recursive: true });
  for (const f of files) writeFileSync(join(dir, f.name), f.data);
  const source: SourceJson = {
    source_id: meta.source_id,
    snapshot: meta.snapshot,
    retrieved_at: new Date().toISOString(),
    method: 'scripted',
    urls: files.map((f) => f.url),
    upstream_commit: meta.upstream_commit,
    license: meta.license,
    files: files.map((f) => ({ path: f.name, sha256: sha256(f.data), bytes: f.data.length })),
    notes: meta.notes,
  };
  writeFileSync(join(dir, 'SOURCE.json'), JSON.stringify(source, null, 2) + '\n');
  return dir;
}

/** Latest snapshot directory for a source, by date name. */
export function latestSnapshot(rawRoot: string, sourceId: string): string {
  const base = join(rawRoot, sourceId);
  const snaps = existsSync(base) ? readdirSync(base).sort() : [];
  const last = snaps[snaps.length - 1];
  if (last === undefined) throw new Error(`No snapshot in ${base}. Run the matching data:fetch script.`);
  return join(base, last);
}
