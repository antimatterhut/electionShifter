import { parse } from 'csv-parse/sync';
import { parseVotes } from './pushbuild.ts';
import type { ReferenceRow } from '../types.ts';

export const REFERENCE_COLUMNS = [
  'race_id',
  'candidate_match',
  'votes',
  'total_votes',
  'status',
  'source_url',
  'retrieved',
  'note',
] as const;

/**
 * Independent statewide totals from the MEDSL state file, for named (non write-in) candidates.
 * Mode rule: use TOTAL if present for that candidate, otherwise sum all modes.
 * candidate_match is the surname before the comma, matched against candidate names in Tier 2.
 */
export function medslReference(
  csvText: string,
  q: { race_id: string; state_po: string; office: string; source_url: string; retrieved: string; commit: string },
): ReferenceRow[] {
  const src = parse(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const mine = src.filter(
    (r) => r.state_po === q.state_po && r.office === q.office && r.stage === 'GEN' && r.writein === 'FALSE',
  );
  const byCand = new Map<string, Record<string, string>[]>();
  for (const r of mine) {
    const list = byCand.get(r.candidate!) ?? [];
    list.push(r);
    byCand.set(r.candidate!, list);
  }
  const out: ReferenceRow[] = [];
  for (const [cand, rs] of byCand) {
    const total = rs.find((r) => r.mode === 'TOTAL');
    const use = total !== undefined ? [total] : rs;
    let votes = 0;
    for (const r of use) {
      const v = parseVotes(r.votes!, `${q.state_po} ${cand}`);
      if (v === null) throw new Error(`MEDSL reference value suppressed for ${cand}`);
      votes += v;
    }
    const totals = new Set(rs.map((r) => r.totalvotes));
    if (totals.size !== 1) throw new Error(`MEDSL totalvotes disagree for ${cand}`);
    const surname = cand.split(',')[0]!.trim().toUpperCase();
    out.push({
      race_id: q.race_id,
      candidate_match: surname,
      votes: String(votes),
      total_votes: [...totals][0]!,
      status: 'certified',
      source_url: q.source_url,
      retrieved: q.retrieved,
      note: `MEDSL ${rs[0]!.version}, upstream commit ${q.commit}. total_votes is MEDSL's own total and is not enforced.`,
    });
  }
  if (out.length === 0) throw new Error(`No MEDSL rows for ${q.state_po} ${q.office}`);
  return out.sort((a, b) => (a.candidate_match < b.candidate_match ? -1 : 1));
}
