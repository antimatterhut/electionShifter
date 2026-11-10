// Types from MASTER_PLAN.md §3 and §4. Pure data shapes; no DOM.

export type PartyGroup = 'D' | 'R' | 'L' | 'G' | 'I' | 'O';
export type Side = 'D' | 'R';

export type Basis = 'total' | 'two_party';

export type MetricId =
  | 'raw_margin'
  | 'margin'
  | 'margin_swing'
  | 'raw_shift'
  | 'candidate_change_raw'
  | 'candidate_change_pct'
  | 'turnout_change_raw'
  | 'turnout_change_pct'
  | 'shift_from_margin'
  | 'shift_from_turnout'
  | 'head_to_head';

export interface Candidate {
  candidate_id: string;
  name: string;
  party: string;
  group: PartyGroup;
  aligned: Side | null;
}

export interface RaceFile {
  schema_version: number;
  race_id: string;
  /** unit_ids, sorted ascending */
  units: string[];
  candidates: Candidate[];
  /** votes[candidate][unit]; null = not reported */
  votes: (number | null)[][];
  other_votes: (number | null)[];
  total_votes: (number | null)[];
}

export interface RaceMeta {
  race_id: string;
  year: number;
  election_date: string;
  state_po: string;
  office: string;
  office_label: string;
  seat: string | null;
  stage: 'gen' | 'runoff';
  status: 'unofficial' | 'certified';
  as_of: string;
  source_ids: string[];
  source_label: string;
  file: string;
  unit_count: number;
  has_dem: boolean;
  has_rep: boolean;
  method_note: string | null;
  validation: { tier1: 'pass' | 'na'; tier2: 'pass' | 'pending'; max_diff_pct: number };
}

/** Why a metric has no value. */
export type ReasonCode =
  | 'no_dr_contest' // no D or no R and no alignment override: "Not comparable: no D–R contest"
  | 'missing_total' // T is zero or null
  | 'zero_baseline' // V_A = 0 for a % change: show "n/a"; raw change still available
  | 'missing_unit' // unit has no usable data in the race
  | 'no_units' // empty selection, or no unit available in both races
  | 'unknown_candidate'; // candidate not on the ballot in this race

export type MetricResult =
  | { value: number; reason: null }
  | { value: null; reason: ReasonCode };

/** Summed inputs for one unit or one group of units. All integers. */
export interface Totals {
  d: number;
  r: number;
  t: number;
  /** race has a D (or D-aligned) candidate on the ballot */
  hasD: boolean;
  /** race has an R (or R-aligned) candidate on the ballot */
  hasR: boolean;
}

export interface Aggregate {
  /** null when no requested unit had usable data */
  totals: Totals | null;
  included: string[];
  /** requested units with no usable data, in request order */
  missing: string[];
  requested: number;
}
