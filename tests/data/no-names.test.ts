import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, 'public/data/v1/manifest.json'), 'utf8')) as {
  races: { race_id: string; file: string }[];
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every candidate name in every race file, de-duplicated. */
const names = new Set<string>();
for (const m of manifest.races) {
  const race = JSON.parse(readFileSync(join(root, 'public/data/v1', m.file), 'utf8')) as {
    candidates: { name: string }[];
  };
  for (const c of race.candidates) names.add(c.name.trim());
}

/**
 * Name parts that are also ordinary words in code (e.g. mapshaper's `id-field`). They are still
 * caught as part of a full name; only the bare word is exempt.
 */
const COMMON_WORDS = new Set(['FIELD']);

/** Full names plus each name part of 4+ letters (so a surname alone is caught). */
const needles = new Set<string>();
for (const n of names) {
  needles.add(n);
  for (const part of n.split(/[^A-Za-z]+/)) {
    if (part.length >= 4 && !COMMON_WORDS.has(part.toUpperCase())) needles.add(part);
  }
}

const mentions = (text: string, n: string) => new RegExp(`\\b${escapeRe(n)}\\b`, 'i').test(text);

describe('no candidate names in code (CLAUDE.md data conventions)', () => {
  it('has candidate names to check against', () => {
    expect(manifest.races.length).toBeGreaterThan(20);
    expect(names.size).toBeGreaterThan(50);
  });

  for (const dir of ['src', 'pipeline']) {
    it(`${dir}/ contains no name from any race file's candidates`, () => {
      const files = walk(join(root, dir)).filter((f) => /\.(ts|css|html)$/.test(f));
      expect(files.length).toBeGreaterThan(0);
      const hits: string[] = [];
      for (const f of files) {
        const text = readFileSync(f, 'utf8');
        for (const n of needles) if (mentions(text, n)) hits.push(`${f}: ${n}`);
      }
      expect(hits).toEqual([]);
    });
  }

  it('index.html contains no candidate name either', () => {
    const text = readFileSync(join(root, 'index.html'), 'utf8');
    expect([...needles].filter((n) => mentions(text, n))).toEqual([]);
  });
});
