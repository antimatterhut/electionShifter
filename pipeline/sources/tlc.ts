import { parse } from 'csv-parse/sync';
import type { Crosswalk } from '../crosswalk.ts';
import type { AdapterResult, RaceMapRow, Row } from '../types.ts';

const COLUMN = /^(.+)([A-Z])_(\d{2}[A-Z])_(.+)$/;

/**
 * Texas Capitol Data Portal VTD file. Columns look like `HarrisD_24G_President`: the letter before
 * `_` is the party, `Write-InW` is write-ins. VTD rows are summed to counties by the first three
 * digits of CNTYVTD. The source has no statewide row, so `statewide` is empty.
 */
export function tlcAdapter(csvText: string, m: RaceMapRow, xw: Crosswalk): AdapterResult {
  const recs = parse(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const first = recs[0];
  if (first === undefined) throw new Error('TLC file is empty');
  const cols = Object.keys(first).filter((c) => c !== 'CNTYVTD' && c !== 'VTDKEY');
  const parsed = cols.map((c) => {
    const x = COLUMN.exec(c);
    if (x === null || x[4] !== m.source_contest) {
      throw new Error(`Unrecognized TLC column "${c}" for ${m.source_contest}`);
    }
    return { col: c, name: x[1]!, party: x[2]! };
  });
  const stateFips = xw.stateFips(m.state_po);
  const sums = new Map<string, number[]>();
  for (const r of recs) {
    const key = r.CNTYVTD!;
    // VTD codes can carry letters (e.g. 0050010A, 10903-3); only the 3-digit county prefix is used.
    if (!/^\d{3}/.test(key)) throw new Error(`Bad CNTYVTD "${key}"`);
    const unit_id = `${stateFips}${key.slice(0, 3)}`;
    if (!xw.unitIds.has(unit_id)) throw new Error(`Unmatched geography label "${key}" -> ${unit_id}`);
    let acc = sums.get(unit_id);
    if (acc === undefined) {
      acc = parsed.map(() => 0);
      sums.set(unit_id, acc);
    }
    parsed.forEach((p, i) => {
      const v = r[p.col]!.trim();
      if (!/^\d+$/.test(v)) throw new Error(`Bad TLC value "${v}" in ${p.col} at ${key}`);
      acc[i]! += Number(v);
    });
  }
  const rows: Row[] = [];
  for (const [unit_id, acc] of sums) {
    parsed.forEach((p, i) => {
      rows.push({ race_id: m.race_id, unit_id, candidate: p.name, party: p.party, votes: acc[i]! });
    });
  }
  return { rows, statewide: [] };
}
