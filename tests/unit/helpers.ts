import type { Candidate, RaceFile } from '../../src/domain/types.ts';

export interface UnitRow {
  id: string;
  d: number | null;
  r: number | null;
  t: number | null;
}

export function cand(id: string, group: Candidate['group'], aligned: Candidate['aligned'] = null): Candidate {
  return { candidate_id: id, name: id, party: group, group, aligned };
}

/** Two-candidate race (D and R) plus other_votes = T - D - R. */
export function makeRace(
  raceId: string,
  rows: UnitRow[],
  dId = 'dem',
  rId = 'rep',
): RaceFile {
  return {
    schema_version: 1,
    race_id: raceId,
    units: rows.map((x) => x.id),
    candidates: [cand(dId, 'D'), cand(rId, 'R')],
    votes: [rows.map((x) => x.d), rows.map((x) => x.r)],
    other_votes: rows.map((x) => (x.t === null || x.d === null || x.r === null ? null : x.t - x.d - x.r)),
    total_votes: rows.map((x) => x.t),
  };
}

// Worked example from MASTER_PLAN.md §4.
export const COLLIN = '48085';
export const DENTON = '48121';

export const raceA = makeRace(
  '2024-TX-president-gen',
  [
    { id: COLLIN, d: 222115, r: 279534, t: 517690 },
    { id: DENTON, d: 191503, r: 250521, t: 449188 },
  ],
  'harris',
  'trump',
);

export const raceB = makeRace(
  '2026-TX-us-senate-gen',
  [
    { id: COLLIN, d: 252403, r: 197096, t: 457641 },
    { id: DENTON, d: 211266, r: 177859, t: 396235 },
  ],
  'talarico',
  'paxton',
);
