import { parse } from 'csv-parse/sync';
import type { Crosswalk } from '../crosswalk.ts';
import { STATEWIDE_UNIT, type AdapterResult, type RaceMapRow, type Row } from '../types.ts';

/** Strict integer parse. Empty or "*" means suppressed (null); anything else non-numeric throws. */
export function parseVotes(v: string, context: string): number | null {
  const s = v.trim();
  if (s === '' || s === '*') return null;
  if (!/^\d+$/.test(s)) throw new Error(`Bad vote value "${v}" at ${context}`);
  return Number(s);
}

/** Pushbuild feed rows for the contests listed in race_map. State rows become `statewide`. */
export function pushbuildAdapter(csvText: string, map: RaceMapRow[], xw: Crosswalk): AdapterResult {
  const src = parse(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const byContest = new Map(map.map((m) => [m.source_contest, m]));
  const rows: Row[] = [];
  const statewide: Row[] = [];
  for (const r of src) {
    const m = byContest.get(r.contest!);
    if (m === undefined || r.state !== m.state_po) continue;
    const ctx = `${r.state} ${r.contest} ${r.county} ${r.candidate}`;
    const votes = parseVotes(r.votes!, ctx);
    if (r.level === 'state') {
      statewide.push({ race_id: m.race_id, unit_id: STATEWIDE_UNIT, candidate: r.candidate!, party: r.party!, votes });
    } else if (r.level === 'county') {
      const unit_id = xw.resolve(m.source_id, m.state_po, r.county!);
      rows.push({ race_id: m.race_id, unit_id, candidate: r.candidate!, party: r.party!, votes });
    } else {
      throw new Error(`Unexpected level "${r.level}" at ${ctx}`);
    }
  }
  return { rows, statewide };
}
