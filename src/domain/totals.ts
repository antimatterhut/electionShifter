// Statewide candidate vote totals for a pair of races. Pure; no DOM.
import { aggregateCandidate, aggregateUnits, commonUnits } from './aggregate.ts';
import type { RaceFile } from './types.ts';
import { headToHeadSides, type ViewSpec } from './view.ts';

export interface CandidateRow {
  candidateId: string;
  name: string;
  party: string;
  votes: number;
  /** Percent of all votes cast in the race over the counted units; null if the total is 0. */
  share: number | null;
}

export interface RaceTotals {
  total: number;
  rows: CandidateRow[];
}

export interface PairTotals {
  a: RaceTotals;
  b: RaceTotals;
  used: number;
  requested: number;
}

function raceTotals(race: RaceFile, units: readonly string[]): RaceTotals {
  const total = aggregateUnits(race, units).totals?.t ?? 0;
  const rows: CandidateRow[] = [];
  for (const c of race.candidates) {
    const votes = aggregateCandidate(race, c.candidate_id, units).votes;
    if (votes === null) continue;
    rows.push({
      candidateId: c.candidate_id,
      name: c.name,
      party: c.party,
      votes,
      share: total > 0 ? (votes / total) * 100 : null,
    });
  }
  rows.sort((x, y) => y.votes - x.votes || x.candidateId.localeCompare(y.candidateId));
  return { total, rows };
}

/** Sums over the units usable in both races so the two columns cover the same counties. */
export function pairTotals(a: RaceFile, b: RaceFile, unitIds: readonly string[]): PairTotals {
  const used = commonUnits(a, b, unitIds);
  return { a: raceTotals(a, used), b: raceTotals(b, used), used: used.length, requested: unitIds.length };
}

/** Votes for the chosen candidate in a race's totals, or null. */
export function votesFor(t: RaceTotals, candidateId: string | null): number | null {
  return t.rows.find((r) => r.candidateId === candidateId)?.votes ?? null;
}

export interface HeadToHeadSummary {
  /** Which race the D-side candidate comes from. */
  dFrom: 'A' | 'B';
  d: { candidateId: string; votes: number; counties: number; share: number };
  r: { candidateId: string; votes: number; counties: number; share: number };
  /** D − R in points of the two candidates' combined votes. */
  margin: number;
  /** D votes − R votes. */
  rawMargin: number;
  ties: number;
  used: number;
  requested: number;
}

/**
 * Hypothetical race between the chosen D-side and R-side candidates, using each one's actual votes
 * over the counties usable in both races. Shares are of the two candidates' combined votes.
 */
export function headToHeadSummary(
  a: RaceFile,
  b: RaceFile,
  spec: Pick<ViewSpec, 'candA' | 'candB'>,
  unitIds: readonly string[],
): HeadToHeadSummary | null {
  const sides = headToHeadSides(a, b, spec);
  if (sides === null) return null;
  const used = commonUnits(a, b, unitIds);
  let dTotal = 0;
  let rTotal = 0;
  let dWon = 0;
  let rWon = 0;
  let ties = 0;
  for (const u of used) {
    const dv = aggregateCandidate(sides.d.race, sides.d.id, [u]).votes;
    const rv = aggregateCandidate(sides.r.race, sides.r.id, [u]).votes;
    if (dv === null || rv === null) continue;
    dTotal += dv;
    rTotal += rv;
    if (dv > rv) dWon++;
    else if (rv > dv) rWon++;
    else ties++;
  }
  const den = dTotal + rTotal;
  if (!(den > 0)) return null;
  return {
    dFrom: sides.d.race === a ? 'A' : 'B',
    d: { candidateId: sides.d.id, votes: dTotal, counties: dWon, share: (dTotal / den) * 100 },
    r: { candidateId: sides.r.id, votes: rTotal, counties: rWon, share: (rTotal / den) * 100 },
    margin: ((dTotal - rTotal) / den) * 100,
    rawMargin: dTotal - rTotal,
    ties,
    used: used.length,
    requested: unitIds.length,
  };
}
