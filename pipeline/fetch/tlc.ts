import { writeSnapshot, download } from '../lib/snapshot.ts';

export const TLC_SOURCE_ID = 'tlc-2024';
/**
 * Texas Capitol Data Portal office ids for the 2024 general election (election 510), from the portal's
 * Offices list (https://ted.capitol.texas.gov/api/Offices). Every statewide office is listed; the ones
 * not on the 2024 ballot return HTTP 500 and are skipped. 1 = President, 2 = U.S. Senate,
 * 44 = Railroad Commissioner, 49/51/53 = Supreme Court Places 2/4/6, 57 = Court of Criminal Appeals
 * presiding judge, 64/65 = Court of Criminal Appeals Places 7/8.
 */
export const TLC_OFFICE_IDS = [1, 2, 44, 49, 51, 53, 57, 64, 65];

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
      notes: 'Texas 2024 general election results by VTD. Statewide offices only; office ids are listed in pipeline/fetch/tlc.ts.',
    },
    files,
  );
}
