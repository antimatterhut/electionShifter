import { partyInfo } from './normalize.ts';
import type { RaceFile, ReferenceRow } from './types.ts';

export interface Tolerance {
  minVotes: number;
  pct: number;
}
/** MASTER_PLAN §6. Never widen to make a test pass. */
export const TOL_UNOFFICIAL_TIER1: Tolerance = { minVotes: 50, pct: 0.1 };
export const TOL_CERTIFIED_TIER2: Tolerance = { minVotes: 50, pct: 0.05 };

export function allowed(reference: number, tol: Tolerance): number {
  return Math.max(tol.minVotes, (reference * tol.pct) / 100);
}

export interface Check {
  what: string;
  actual: number;
  expected: number;
  diff: number;
  diffPct: number;
  ok: boolean;
}

function check(what: string, actual: number, expected: number, tol: Tolerance): Check {
  const diff = Math.abs(actual - expected);
  return {
    what,
    actual,
    expected,
    diff,
    diffPct: expected === 0 ? (diff === 0 ? 0 : 100) : (diff / expected) * 100,
    ok: diff <= allowed(expected, tol),
  };
}

export function sumColumn(col: (number | null)[]): number {
  let s = 0;
  for (const v of col) {
    if (v === null) throw new Error('Null vote value in a column that must be complete');
    s += v;
  }
  return s;
}

/** Throws when any check fails. Returns the largest difference as a percentage. */
export function assertChecks(label: string, checks: Check[]): number {
  const bad = checks.filter((c) => !c.ok);
  if (bad.length > 0) {
    const lines = bad.map((c) => `  ${c.what}: got ${c.actual}, expected ${c.expected} (diff ${c.diff}, ${c.diffPct.toFixed(4)}%)`);
    throw new Error(`${label} FAILED:\n${lines.join('\n')}`);
  }
  return checks.reduce((m, c) => Math.max(m, c.diffPct), 0);
}

/**
 * Tier 1: county sums equal the same source's statewide row, per candidate, write-ins and total.
 * `statewide` is the statewide rows run through buildRace over the single unit STATE.
 */
export function tier1(race: RaceFile, statewide: RaceFile, tol: Tolerance = TOL_UNOFFICIAL_TIER1): number {
  const checks: Check[] = [];
  const sIdx = new Map(statewide.candidates.map((c, i) => [c.candidate_id, i]));
  if (statewide.candidates.length !== race.candidates.length) {
    throw new Error(`Tier 1 ${race.race_id}: candidate lists differ between county and statewide rows`);
  }
  race.candidates.forEach((c, i) => {
    const j = sIdx.get(c.candidate_id);
    if (j === undefined) throw new Error(`Tier 1 ${race.race_id}: ${c.name} missing from statewide rows`);
    checks.push(check(c.name, sumColumn(race.votes[i]!), statewide.votes[j]![0]!, tol));
  });
  checks.push(check('write-ins and other', sumColumn(race.other_votes), statewide.other_votes[0]!, tol));
  checks.push(check('total votes', sumColumn(race.total_votes), statewide.total_votes[0]!, tol));
  return assertChecks(`Tier 1 ${race.race_id}`, checks);
}

/**
 * Tier 2: county sums against an independent published statewide total, for D, R and the top 3
 * candidates by votes. Every checked candidate must have exactly one reference row.
 */
export function tier2(race: RaceFile, refs: ReferenceRow[], tol: Tolerance = TOL_CERTIFIED_TIER2): number {
  const mine = refs.filter((r) => r.race_id === race.race_id);
  if (mine.length === 0) throw new Error(`Tier 2 ${race.race_id}: no rows in statewide_totals.csv`);
  const sums = race.candidates.map((c, i) => ({ c, sum: sumColumn(race.votes[i]!) }));
  const top3 = new Set([...sums].sort((a, b) => b.sum - a.sum).slice(0, 3).map((s) => s.c.candidate_id));
  const checks: Check[] = [];
  for (const { c, sum } of sums) {
    const major = partyInfo(c.party).group === 'D' || partyInfo(c.party).group === 'R';
    if (!major && !top3.has(c.candidate_id)) continue;
    const hits = mine.filter((r) => c.name.toUpperCase().includes(r.candidate_match.toUpperCase()));
    if (hits.length !== 1) {
      throw new Error(`Tier 2 ${race.race_id}: ${hits.length} reference rows match ${c.name}; need exactly 1`);
    }
    checks.push(check(c.name, sum, Number(hits[0]!.votes), tol));
  }
  return assertChecks(`Tier 2 ${race.race_id}`, checks);
}

/** Every vote value in a race must be a non-negative integer, with no nulls. */
export function assertComplete(race: RaceFile): void {
  const n = race.units.length;
  const cols = [...race.votes, race.other_votes, race.total_votes];
  for (const col of cols) {
    if (col.length !== n) throw new Error(`${race.race_id}: column length ${col.length} != ${n} units`);
    for (const v of col) {
      if (v === null || !Number.isInteger(v) || v < 0) throw new Error(`${race.race_id}: bad vote value ${String(v)}`);
    }
  }
  race.units.forEach((u, i) => {
    const t = race.votes.reduce((s, c) => s + c[i]!, 0) + race.other_votes[i]!;
    if (t !== race.total_votes[i]) throw new Error(`${race.race_id}: total mismatch at ${u}`);
  });
}
