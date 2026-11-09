import type { MetricId } from '../domain/types.ts';

export interface MetricInfo {
  label: string;
  /** Short noun used in aria-labels, e.g. "swing +23.18 pts". */
  short: string;
  /** One-sentence definition shown next to the selector. */
  define: (a: string, b: string) => string;
  /** What the colors mean, for the subtitle. */
  colors: string;
  /** Plain-English reading of the scale direction, for the legend. */
  direction: { neg: string; pos: string };
}

const PARTISAN = { neg: '◀ Toward Republicans (red)', pos: 'Toward Democrats (blue) ▶' };
const LEAD = { neg: '◀ Republican lead (red)', pos: 'Democratic lead (blue) ▶' };
const CHANGE = { neg: '◀ Decrease (purple)', pos: 'Increase (green) ▶' };

export const METRICS: Record<MetricId, MetricInfo> = {
  margin_swing: {
    label: 'Margin swing',
    short: 'swing',
    define: (a, b) =>
      `How far the Democratic-minus-Republican margin moved from ${a} to ${b}, in percentage points of the vote.`,
    colors: 'Blue = shifted toward Democrats. Red = shifted toward Republicans.',
    direction: PARTISAN,
  },
  raw_shift: {
    label: 'Raw margin shift',
    short: 'raw shift',
    define: (a, b) =>
      `Change in the Democratic-minus-Republican vote margin from ${a} to ${b}, counted in votes.`,
    colors: 'Blue = margin moved toward Democrats. Red = toward Republicans.',
    direction: PARTISAN,
  },
  shift_from_margin: {
    label: 'Shift from margin change',
    short: 'shift from margin change',
    define: () =>
      'The part of the raw margin shift that comes from a change in the margin percentage, holding the first race’s turnout fixed.',
    colors: 'Blue = toward Democrats. Red = toward Republicans.',
    direction: PARTISAN,
  },
  shift_from_turnout: {
    label: 'Shift from turnout change',
    short: 'shift from turnout change',
    define: () =>
      'The part of the raw margin shift that comes from more or fewer people voting, at the second race’s margin; with the margin part it adds up to the raw shift.',
    colors: 'Blue = toward Democrats. Red = toward Republicans.',
    direction: PARTISAN,
  },
  margin: {
    label: 'Margin (one race)',
    short: 'margin',
    define: () => 'Democratic votes minus Republican votes, as points of the vote, in the chosen race.',
    colors: 'Blue = Democratic lead. Red = Republican lead.',
    direction: LEAD,
  },
  raw_margin: {
    label: 'Raw margin (one race)',
    short: 'raw margin',
    define: () => 'Democratic votes minus Republican votes, counted in votes, in the chosen race.',
    colors: 'Blue = Democratic lead. Red = Republican lead.',
    direction: LEAD,
  },
  candidate_change_pct: {
    label: 'Candidate change, %',
    short: 'candidate change',
    define: (a, b) =>
      `Votes for the chosen ${b} candidate compared with the chosen ${a} candidate, as a percent of the ${a} votes.`,
    colors: 'Green = more votes. Purple = fewer votes.',
    direction: CHANGE,
  },
  candidate_change_raw: {
    label: 'Candidate change, votes',
    short: 'candidate change',
    define: (a, b) => `Votes for the chosen ${b} candidate minus votes for the chosen ${a} candidate.`,
    colors: 'Green = more votes. Purple = fewer votes.',
    direction: CHANGE,
  },
  turnout_change_pct: {
    label: 'Turnout change, %',
    short: 'turnout change',
    define: (a, b) => `Total votes cast in ${b} compared with ${a}, as a percent of the ${a} total.`,
    colors: 'Green = more people voted. Purple = fewer people voted.',
    direction: CHANGE,
  },
  turnout_change_raw: {
    label: 'Turnout change, votes',
    short: 'turnout change',
    define: (a, b) => `Total votes cast in ${b} minus total votes cast in ${a}.`,
    colors: 'Green = more people voted. Purple = fewer people voted.',
    direction: CHANGE,
  },
};

export const BASIS_NOTE = {
  total: 'Margin = (D − R) ÷ total votes.',
  two_party: 'Margin = (D − R) ÷ (D + R), ignoring other candidates.',
} as const;
