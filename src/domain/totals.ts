// Statewide candidate vote totals for a pair of races. Pure; no DOM.
import { aggregateCandidate, aggregateUnits, commonUnits } from './aggregate.ts';
import type { RaceFile } from './types.ts';

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
