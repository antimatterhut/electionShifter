import { writeSnapshot, download } from '../lib/snapshot.ts';

export const PUSHBUILD_SOURCE_ID = 'pushbuild-2026';
export const PUSHBUILD_REPO = 'pushbuild/us-2026-election-results';
/** Upstream commit "Results as of November 6, 2026, 11:32 PM ET" that produced the golden values. */
export const PUSHBUILD_PINNED_SHA = '56b4b499507f5b8fce9433640de34a56df4ad619';

export async function fetchPushbuild(rawRoot: string, today: string, sha = PUSHBUILD_PINNED_SHA): Promise<string> {
  const url = `https://raw.githubusercontent.com/${PUSHBUILD_REPO}/${sha}/data/tx.csv`;
  return writeSnapshot(
    rawRoot,
    {
      source_id: PUSHBUILD_SOURCE_ID,
      snapshot: today,
      upstream_commit: sha,
      license: 'CC0 (per upstream repository)',
      notes: 'Unofficial 2026 general results, Texas only, pinned to an upstream commit.',
    },
    [{ name: 'tx.csv', url, data: await download(url) }],
  );
}
