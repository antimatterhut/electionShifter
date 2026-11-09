// Race list helpers for the picker. Pure; no DOM. Everything comes from the manifest.
import type { RaceMeta } from './types.ts';

/** Display order of offices within a year. Unknown offices sort after these, by label. */
const OFFICE_ORDER = [
  'president',
  'us-senate',
  'governor',
  'lt-governor',
  'attorney-general',
  'comptroller',
  'land-commissioner',
  'agriculture-commissioner',
  'railroad-commissioner',
  'supreme-court',
  'court-of-criminal-appeals',
  'fifteenth-court-of-appeals',
];

function rank(office: string): number {
  const i = OFFICE_ORDER.indexOf(office);
  return i === -1 ? OFFICE_ORDER.length : i;
}

/** Races sorted by year (newest first), then office order, then label. */
export function sortRaces(races: readonly RaceMeta[]): RaceMeta[] {
  return [...races].sort(
    (a, b) =>
      b.year - a.year ||
      rank(a.office) - rank(b.office) ||
      (a.office_label < b.office_label ? -1 : a.office_label > b.office_label ? 1 : 0) ||
      (a.race_id < b.race_id ? -1 : 1),
  );
}

/** Step 1 of the picker: distinct years, newest first. */
export function yearsOf(races: readonly RaceMeta[]): number[] {
  return [...new Set(races.map((r) => r.year))].sort((a, b) => b - a);
}

/** Step 2 of the picker: the races held in one year. */
export function racesInYear(races: readonly RaceMeta[], year: number): RaceMeta[] {
  return sortRaces(races.filter((r) => r.year === year));
}

/**
 * The race to select after the year changes: the same office (and seat) if the new year has it,
 * otherwise the first race of that year.
 */
export function raceAfterYearChange(
  races: readonly RaceMeta[],
  current: RaceMeta,
  year: number,
): RaceMeta | null {
  const inYear = racesInYear(races, year);
  return (
    inYear.find((r) => r.office === current.office && r.seat === current.seat) ?? inYear[0] ?? null
  );
}

export function raceLabel(m: Pick<RaceMeta, 'year' | 'office_label'>): string {
  return `${m.year} ${m.office_label}`;
}
