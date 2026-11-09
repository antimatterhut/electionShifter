import type { Candidate, Group, RaceFile, Row } from './types.ts';

const PARTY_CODES: Record<string, { code: string; group: Group }> = {
  D: { code: 'DEM', group: 'D' },
  DEM: { code: 'DEM', group: 'D' },
  DEMOCRAT: { code: 'DEM', group: 'D' },
  R: { code: 'REP', group: 'R' },
  REP: { code: 'REP', group: 'R' },
  REPUBLICAN: { code: 'REP', group: 'R' },
  L: { code: 'LIB', group: 'L' },
  LIB: { code: 'LIB', group: 'L' },
  LIBERTARIAN: { code: 'LIB', group: 'L' },
  G: { code: 'GRN', group: 'G' },
  GRN: { code: 'GRN', group: 'G' },
  GREEN: { code: 'GRN', group: 'G' },
  I: { code: 'IND', group: 'I' },
  IND: { code: 'IND', group: 'I' },
};

const WRITE_IN_PARTIES = new Set(['W', 'WRITEIN', 'WRITE-IN', 'WI']);

export function isWriteIn(row: Pick<Row, 'candidate' | 'party'>): boolean {
  const p = row.party.trim().toUpperCase();
  return WRITE_IN_PARTIES.has(p) || /^WRITE[- ]?INS?$/i.test(row.candidate.trim());
}

/**
 * Party code and group for one source line. Combined codes such as `DEM/NON` use the first
 * recognized party. `combined` is true when that rule was applied.
 */
export function partyInfo(party: string): { code: string; group: Group; combined: boolean } {
  const up = party.trim().toUpperCase();
  const hit = PARTY_CODES[up];
  if (hit !== undefined) return { ...hit, combined: false };
  const parts = up.split('/').map((s) => s.trim());
  if (parts.length > 1) {
    for (const p of parts) {
      const h = PARTY_CODES[p];
      if (h !== undefined) return { ...h, combined: true };
    }
  }
  return { code: up, group: 'O', combined: parts.length > 1 };
}

export function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const GROUP_RANK: Record<Group, number> = { D: 0, R: 1, L: 2, G: 3, I: 4, O: 5 };

function addVotes(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a + b;
}

/**
 * Turn adapter rows for one race into a race file over the given units.
 * - Lines for one candidate name (fusion) are summed; group is the major-party line if any,
 *   otherwise the line with the most votes.
 * - Write-ins go to other_votes. Named ballot candidates are always kept.
 * - A suppressed value stays null, never 0. A unit with no rows at all is null throughout.
 */
export function buildRace(raceId: string, units: string[], rows: Row[]): RaceFile {
  const unitIdx = new Map(units.map((u, i) => [u, i]));
  type Line = { party: string; votes: (number | null)[]; seen: boolean[] };
  const cands = new Map<string, Map<string, Line>>();
  const other: (number | null)[] = units.map(() => 0);
  const unitHasRows = units.map(() => false);

  for (const r of rows) {
    if (r.race_id !== raceId) throw new Error(`Row for ${r.race_id} passed to ${raceId}`);
    const i = unitIdx.get(r.unit_id);
    if (i === undefined) throw new Error(`Row for unit ${r.unit_id} outside the race's unit list`);
    unitHasRows[i] = true;
    if (isWriteIn(r)) {
      other[i] = addVotes(other[i]!, r.votes);
      continue;
    }
    const name = r.candidate.trim();
    let lines = cands.get(name);
    if (lines === undefined) {
      lines = new Map();
      cands.set(name, lines);
    }
    const info = partyInfo(r.party);
    let line = lines.get(info.code);
    if (line === undefined) {
      line = { party: info.code, votes: units.map(() => 0), seen: units.map(() => false) };
      lines.set(info.code, line);
    }
    line.votes[i] = addVotes(line.votes[i]!, r.votes);
    line.seen[i] = true;
  }

  const built: { cand: Candidate; votes: (number | null)[]; sum: number }[] = [];
  const seenIds = new Map<string, string>();
  for (const [name, lines] of cands) {
    const all = [...lines.values()];
    const total = (l: Line) => l.votes.reduce<number>((s, v) => s + (v ?? 0), 0);
    const major = all.filter((l) => partyInfo(l.party).group === 'D' || partyInfo(l.party).group === 'R');
    const pool = major.length > 0 ? major : all;
    const chosen = [...pool].sort((a, b) => total(b) - total(a) || (a.party < b.party ? -1 : 1))[0]!;
    const votes = units.map((_, i) => {
      // No line at all for this unit means "not reported", never 0.
      if (!all.some((l) => l.seen[i])) return null;
      let v: number | null = 0;
      for (const l of all) v = l.seen[i] ? addVotes(v, l.votes[i]!) : v;
      return v;
    });
    const candidate_id = slug(name);
    const clash = seenIds.get(candidate_id);
    if (clash !== undefined && clash !== name) throw new Error(`candidate_id clash: "${clash}" and "${name}"`);
    seenIds.set(candidate_id, name);
    built.push({
      cand: { candidate_id, name, party: chosen.party, group: partyInfo(chosen.party).group, aligned: null },
      votes,
      sum: votes.reduce<number>((s, v) => s + (v ?? 0), 0),
    });
  }
  built.sort(
    (a, b) =>
      GROUP_RANK[a.cand.group] - GROUP_RANK[b.cand.group] ||
      b.sum - a.sum ||
      (a.cand.candidate_id < b.cand.candidate_id ? -1 : 1),
  );

  const other_votes = units.map((_, i) => (unitHasRows[i] ? other[i]! : null));
  const total_votes = units.map((_, i) => {
    let t: number | null = other_votes[i]!;
    for (const b of built) t = addVotes(t, b.votes[i]!);
    return t;
  });
  return {
    schema_version: 1,
    race_id: raceId,
    units,
    candidates: built.map((b) => b.cand),
    votes: built.map((b) => b.votes),
    other_votes,
    total_votes,
  };
}
