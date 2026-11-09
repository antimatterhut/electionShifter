export type Group = 'D' | 'R' | 'L' | 'G' | 'I' | 'O';

/** One adapter output row. votes is null when the source suppressed or did not report the value. */
export interface Row {
  race_id: string;
  unit_id: string;
  candidate: string;
  party: string;
  votes: number | null;
}

export interface Candidate {
  candidate_id: string;
  name: string;
  party: string;
  group: Group;
  aligned: 'D' | 'R' | null;
}

export interface RaceFile {
  schema_version: 1;
  race_id: string;
  units: string[];
  candidates: Candidate[];
  votes: (number | null)[][];
  other_votes: (number | null)[];
  total_votes: (number | null)[];
}

export interface RaceMapRow {
  source_id: string;
  source_file: string;
  source_contest: string;
  race_id: string;
  year: string;
  election_date: string;
  state_po: string;
  office: string;
  office_label: string;
  seat: string;
  stage: string;
  status: string;
  as_of: string;
  source_label: string;
  method_note: string;
}

/** What an adapter returns: county-level rows, plus the source's own statewide rows if it has any. */
export interface AdapterResult {
  rows: Row[];
  statewide: Row[];
}

export interface ReferenceRow {
  race_id: string;
  candidate_match: string;
  votes: string;
  total_votes: string;
  status: string;
  source_url: string;
  retrieved: string;
  note: string;
}

export const STATEWIDE_UNIT = 'STATE';
