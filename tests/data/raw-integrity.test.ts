import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listSnapshots, verifySnapshot } from '../../pipeline/lib/hash.ts';

const rawRoot = join(process.cwd(), 'data/raw');

describe('raw snapshot integrity', () => {
  const snaps = listSnapshots(rawRoot);

  it('has at least one snapshot', () => {
    expect(snaps.length).toBeGreaterThan(0);
  });

  it.each(snaps)('%s: every SOURCE.json hash and size matches', (dir) => {
    expect(verifySnapshot(dir)).toEqual([]);
  });
});
