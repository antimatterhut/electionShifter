// Shareable view state <-> URL query string. Pure; no DOM. Invalid input never throws: each bad
// value falls back to the default and adds a notice.
import type { Basis, MetricId } from './types.ts';
import { METRIC_IDS, type Which } from './view.ts';

export const URL_VERSION = '1';
export const LIVE_URL = 'https://antimatterhut.github.io/electionShifter/';
export const MODES = ['president', 'mosaic'] as const;
export type Mode = (typeof MODES)[number];

export interface UrlState {
  a: string;
  b: string;
  metric: MetricId;
  basis: Basis;
  which: Which;
  state: string;
  candA: string | null;
  candB: string | null;
  group: string[];
  groupName: string;
  mode: Mode | null;
}

export interface UrlKnown {
  /** Race ids in the manifest. */
  races: readonly string[];
  /** Unit ids that may appear in a group. */
  units: readonly string[];
  /** State codes the app can show. */
  states: readonly string[];
  defaults: Pick<UrlState, 'a' | 'b' | 'state'>;
}

export interface ParsedUrl {
  state: UrlState;
  notices: string[];
}

const MAX_NAME = 60;
const MAX_ID = 80;

/** Parses a query string (with or without `?`). Never throws. */
export function parseUrlState(search: string, known: UrlKnown): ParsedUrl {
  const notices: string[] = [];
  const p = new URLSearchParams(search);
  const state: UrlState = {
    a: known.defaults.a,
    b: known.defaults.b,
    metric: 'margin_swing',
    basis: 'total',
    which: 'B',
    state: known.defaults.state,
    candA: null,
    candB: null,
    group: [],
    groupName: '',
    mode: null,
  };
  if ([...p.keys()].length === 0) return { state, notices };

  const bad = (name: string, v: string) => notices.push(`Ignored invalid link value ${name}=${v.slice(0, 40)}.`);

  const v = p.get('v');
  if (v !== null && v !== URL_VERSION) notices.push(`This link uses version ${v.slice(0, 10)}, which this site does not know; showing what could be read.`);

  const st = p.get('state');
  if (st !== null) {
    if (known.states.includes(st)) state.state = st;
    else bad('state', st);
  }
  for (const k of ['a', 'b'] as const) {
    const x = p.get(k);
    if (x === null) continue;
    if (known.races.includes(x)) state[k] = x;
    else bad(k, x);
  }
  const metric = p.get('metric');
  if (metric !== null) {
    if ((METRIC_IDS as string[]).includes(metric)) state.metric = metric as MetricId;
    else bad('metric', metric);
  }
  const basis = p.get('basis');
  if (basis !== null) {
    if (basis === 'total' || basis === 'two_party') state.basis = basis;
    else bad('basis', basis);
  }
  const which = p.get('which');
  if (which !== null) {
    if (which === 'A' || which === 'B') state.which = which;
    else bad('which', which);
  }
  for (const [k, dst] of [
    ['ca', 'candA'],
    ['cb', 'candB'],
  ] as const) {
    const x = p.get(k);
    if (x === null) continue;
    if (x.length > 0 && x.length <= MAX_ID) state[dst] = x;
    else bad(k, x);
  }
  const g = p.get('g');
  if (g !== null && g !== '') {
    const ok = new Set(known.units);
    const seen = new Set<string>();
    let dropped = 0;
    for (const id of g.split(',')) {
      if (ok.has(id) && !seen.has(id)) {
        seen.add(id);
        state.group.push(id);
      } else dropped++;
    }
    if (dropped > 0) notices.push(`Ignored ${dropped} invalid or repeated county id${dropped === 1 ? '' : 's'} in the group.`);
  }
  const gname = p.get('gname');
  if (gname !== null) state.groupName = gname.slice(0, MAX_NAME);
  const mode = p.get('mode');
  if (mode !== null) {
    if ((MODES as readonly string[]).includes(mode)) state.mode = mode as Mode;
    else bad('mode', mode);
  }
  return { state, notices };
}

/** Query string (no leading `?`). Deterministic order. */
export function serializeUrlState(s: UrlState): string {
  const p = new URLSearchParams();
  p.set('v', URL_VERSION);
  p.set('a', s.a);
  p.set('b', s.b);
  p.set('metric', s.metric);
  p.set('basis', s.basis);
  p.set('which', s.which);
  p.set('state', s.state);
  if (s.candA !== null) p.set('ca', s.candA);
  if (s.candB !== null) p.set('cb', s.candB);
  if (s.group.length > 0) p.set('g', s.group.join(','));
  if (s.groupName !== '') p.set('gname', s.groupName);
  if (s.mode !== null) p.set('mode', s.mode);
  return p.toString();
}

/** Full shareable link. Always the live site, never the current origin. */
export function shareUrl(s: UrlState): string {
  return `${LIVE_URL}?${serializeUrlState(s)}`;
}
