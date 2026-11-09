import { writeSnapshot, download } from '../lib/snapshot.ts';

export const MEDSL_SOURCE_ID = 'medsl-2024';
export const MEDSL_REPO = 'MEDSL/2024-elections-official';
export const MEDSL_PINNED_SHA = 'df531089c78e6d0098db1a6bfb3849a066a06995';
export const MEDSL_FILES = ['2024-president-state.csv', '2024-senate-state.csv'];

export async function fetchMedsl(rawRoot: string, today: string, sha = MEDSL_PINNED_SHA): Promise<string> {
  const files = [];
  for (const name of MEDSL_FILES) {
    const url = `https://raw.githubusercontent.com/${MEDSL_REPO}/${sha}/${name}`;
    files.push({ name, url, data: await download(url) });
  }
  return writeSnapshot(
    rawRoot,
    {
      source_id: MEDSL_SOURCE_ID,
      snapshot: today,
      upstream_commit: sha,
      license: 'Repository has no license file; used only as an independent cross-check (Tier 2), not republished',
      notes: 'MEDSL 2024 President and U.S. Senate state totals. Independent reference for Tier 2 validation.',
    },
    files,
  );
}
