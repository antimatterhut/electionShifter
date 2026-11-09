import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function sha256(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

export interface SourceFile {
  path: string;
  sha256: string;
  bytes: number;
}

export interface SourceJson {
  source_id: string;
  snapshot: string;
  retrieved_at: string;
  method: 'scripted' | 'manual';
  urls: string[];
  upstream_commit: string | null;
  license: string;
  files: SourceFile[];
  notes: string;
}

/** Returns a list of problems (empty = all hashes and sizes match). */
export function verifySnapshot(dir: string): string[] {
  const problems: string[] = [];
  let src: SourceJson;
  try {
    src = JSON.parse(readFileSync(join(dir, 'SOURCE.json'), 'utf8')) as SourceJson;
  } catch {
    return [`${dir}: SOURCE.json missing or unreadable`];
  }
  if (src.files.length === 0) problems.push(`${dir}: SOURCE.json lists no files`);
  for (const f of src.files) {
    try {
      const buf = readFileSync(join(dir, f.path));
      if (buf.length !== f.bytes) problems.push(`${dir}/${f.path}: size ${buf.length} != ${f.bytes}`);
      if (sha256(buf) !== f.sha256) problems.push(`${dir}/${f.path}: sha256 mismatch`);
    } catch {
      problems.push(`${dir}/${f.path}: file missing`);
    }
  }
  return problems;
}

/** All snapshot directories under a raw root: <root>/<source_id>/<snapshot>. */
export function listSnapshots(rawRoot: string): string[] {
  const out: string[] = [];
  for (const s of readdirSync(rawRoot).sort()) {
    const sd = join(rawRoot, s);
    if (!statSync(sd).isDirectory()) continue;
    for (const snap of readdirSync(sd).sort()) {
      const p = join(sd, snap);
      if (statSync(p).isDirectory()) out.push(p);
    }
  }
  return out;
}
