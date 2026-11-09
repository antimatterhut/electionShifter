import type { Aggregate, Candidate, RaceFile, Side, Totals } from './types.ts';

/** `aligned ?? group`, restricted to the two sides that count toward margins. */
export function sideOf(c: Candidate): Side | null {
  const s = c.aligned ?? c.group;
  return s === 'D' || s === 'R' ? s : null;
}

function unitIndex(race: RaceFile): Map<string, number> {
  return new Map(race.units.map((u, i) => [u, i]));
}

function raceSides(race: RaceFile): { hasD: boolean; hasR: boolean } {
  let hasD = false;
  let hasR = false;
  for (const c of race.candidates) {
    const s = sideOf(c);
    if (s === 'D') hasD = true;
    if (s === 'R') hasR = true;
  }
  return { hasD, hasR };
}

/**
 * D, R, T for one unit index, or null if any input it needs (the total, or a
 * D/R candidate vote) is null. Null is never treated as 0.
 */
function inputsAt(race: RaceFile, i: number): { d: number; r: number; t: number } | null {
  const t = race.total_votes[i];
  if (t === null || t === undefined) return null;
  let d = 0;
  let r = 0;
  for (let c = 0; c < race.candidates.length; c++) {
    const side = sideOf(race.candidates[c]!);
    if (side === null) continue;
    const v = race.votes[c]?.[i];
    if (v === null || v === undefined) return null;
    if (side === 'D') d += v;
    else r += v;
  }
  return { d, r, t };
}

/** Sum D, R and T over every requested unit that has data. Metrics are applied afterwards. */
export function aggregateUnits(race: RaceFile, unitIds: readonly string[]): Aggregate {
  const idx = unitIndex(race);
  const { hasD, hasR } = raceSides(race);
  const included: string[] = [];
  const missing: string[] = [];
  let d = 0;
  let r = 0;
  let t = 0;
  for (const id of unitIds) {
    const i = idx.get(id);
    const u = i === undefined ? null : inputsAt(race, i);
    if (u === null) {
      missing.push(id);
      continue;
    }
    included.push(id);
    d += u.d;
    r += u.r;
    t += u.t;
  }
  const totals: Totals | null = included.length === 0 ? null : { d, r, t, hasD, hasR };
  return { totals, included, missing, requested: unitIds.length };
}

/** Totals for a single unit. */
export function unitTotals(race: RaceFile, unitId: string): Totals | null {
  return aggregateUnits(race, [unitId]).totals;
}

/** Units that have usable data in this race. */
export function availableUnits(race: RaceFile, unitIds: readonly string[]): string[] {
  return aggregateUnits(race, unitIds).included;
}

/** Units usable in both races: the only units a comparison may include. */
export function commonUnits(a: RaceFile, b: RaceFile, unitIds: readonly string[]): string[] {
  const inA = new Set(availableUnits(a, unitIds));
  return availableUnits(b, unitIds).filter((u) => inA.has(u));
}

/**
 * Summed votes for one candidate over the units that have a non-null value.
 * `votes` is null if the candidate is not on the ballot or no unit reported.
 */
export function aggregateCandidate(
  race: RaceFile,
  candidateId: string,
  unitIds: readonly string[],
): { votes: number | null; onBallot: boolean; included: string[]; missing: string[] } {
  const c = race.candidates.findIndex((x) => x.candidate_id === candidateId);
  if (c < 0) return { votes: null, onBallot: false, included: [], missing: [...unitIds] };
  const idx = unitIndex(race);
  const included: string[] = [];
  const missing: string[] = [];
  let sum = 0;
  for (const id of unitIds) {
    const i = idx.get(id);
    const v = i === undefined ? null : (race.votes[c]?.[i] ?? null);
    if (v === null) missing.push(id);
    else {
      included.push(id);
      sum += v;
    }
  }
  return { votes: included.length === 0 ? null : sum, onBallot: true, included, missing };
}
