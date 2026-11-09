import { writeSnapshot, download } from '../lib/snapshot.ts';

export const TLC_SOURCE_ID = 'tlc-2024';
/** Texas Capitol Data Portal office ids: 1 = President, 2 = U.S. Senate. Ids 3-4 return HTTP 500. */
export const TLC_OFFICE_IDS = [1, 2];

export async function fetchTlc(rawRoot: string, today: string): Promise<string> {
  const files = [];
  for (const id of TLC_OFFICE_IDS) {
    const url = `https://ted.capitol.texas.gov/api/Offices/510/${id}/vtd`;
    files.push({ name: `tlc-${id}.csv`, url, data: await download(url) });
  }
  return writeSnapshot(
    rawRoot,
    {
      source_id: TLC_SOURCE_ID,
      snapshot: today,
      upstream_commit: null,
      license: 'CC BY (Texas Legislative Council)',
      notes: 'Texas 2024 general election results by VTD. Office 1 = President, 2 = U.S. Senate.',
    },
    files,
  );
}
