// Side panel for the hypothetical head-to-head: candidates with their colors, the statewide result,
// and exact votes for the county under the pointer. Also the (short) hover text for that mode.
import { fmtCount } from '../domain/format.ts';
import type { HeadToHeadSummary } from '../domain/totals.ts';

export const D_COLOR = '#2166ac';
export const R_COLOR = '#b2182b';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export interface MatchupNames {
  /** Display text for the D-side and R-side candidate, e.g. "Name (2026 U.S. Senate)". */
  d: string;
  r: string;
  /** Short names for tight spaces. */
  dShort: string;
  rShort: string;
}

const pct = (n: number) => `${n.toFixed(1)}%`;

function leadText(s: HeadToHeadSummary, n: MatchupNames, where: string): string {
  if (s.rawMargin === 0) return `Exact tie ${where}.`;
  const dWins = s.rawMargin > 0;
  return `${esc(dWins ? n.dShort : n.rShort)} wins ${where} by ${fmtCount(Math.abs(s.rawMargin))} votes (${Math.abs(s.margin).toFixed(1)} points).`;
}

function rows(s: HeadToHeadSummary, n: MatchupNames, countiesCol: boolean): string {
  const row = (cls: 'd' | 'r', name: string, side: HeadToHeadSummary['d']) =>
    `<li class="${cls}"><span class="swatch" style="background:${cls === 'd' ? D_COLOR : R_COLOR}"></span>
      <span class="who-name">${esc(name)}</span>
      <span class="who-pct">${pct(side.share)}</span>
      <span class="who-votes">${fmtCount(side.votes)} votes${countiesCol ? `, ${side.counties} counties` : ''}</span></li>`;
  // Winner first.
  const order: ('d' | 'r')[] = s.d.votes >= s.r.votes ? ['d', 'r'] : ['r', 'd'];
  return order.map((k) => (k === 'd' ? row('d', n.d, s.d) : row('r', n.r, s.r))).join('');
}

export interface MatchupInput {
  stateName: string;
  names: MatchupNames | null;
  /** Statewide result; null when the pair is not a D vs R matchup. */
  statewide: HeadToHeadSummary | null;
  blockedMessage: string | null;
  county: { name: string; summary: HeadToHeadSummary | null } | null;
}

export function renderMatchup(host: HTMLElement, m: MatchupInput): void {
  if (m.names === null || m.statewide === null) {
    host.innerHTML = `<h2>Matchup</h2><p class="hint">${esc(m.blockedMessage ?? 'Pick one Democratic and one Republican candidate.')}</p>`;
    return;
  }
  const n = m.names;
  const s = m.statewide;
  const county = m.county;
  let countyHtml = `<p class="hint">Hover or tap a county on the map to see its exact votes here.</p>`;
  if (county !== null) {
    countyHtml =
      county.summary === null
        ? `<h3>${esc(county.name)} County</h3><p class="missing">No data for this county in both races.</p>`
        : `<h3>${esc(county.name)} County</h3>
           <ul class="matchup-rows">${rows(county.summary, n, false)}</ul>
           <p class="lead">${leadText(county.summary, n, 'this county')}</p>`;
  }
  host.innerHTML = `
    <h2>${esc(m.stateName)} matchup</h2>
    <ul class="matchup-rows" id="matchup-state">${rows(s, n, true)}</ul>
    <div class="split" role="img" aria-label="${esc(n.dShort)} ${pct(s.d.share)}, ${esc(n.rShort)} ${pct(s.r.share)}">
      <span style="width:${s.d.share}%;background:${D_COLOR}"></span><span style="width:${s.r.share}%;background:${R_COLOR}"></span>
    </div>
    <p class="lead">${leadText(s, n, `${esc(m.stateName)}`)}</p>
    <p class="sub">Shares are of the two candidates' combined votes, using each one's real votes from their own election.</p>
    <div id="matchup-county">${countyHtml}</div>`;
}

/** Hover text for one county in head-to-head mode. */
export function matchupTooltip(name: string, s: HeadToHeadSummary | null, n: MatchupNames): string {
  if (s === null) return `<h3>${esc(name)} County</h3><p class="missing">No data for this county in both races.</p>`;
  return `<h3>${esc(name)} County</h3>
    <p><span class="swatch" style="background:${D_COLOR}"></span> <strong>${esc(n.dShort)}</strong>: ${fmtCount(s.d.votes)} votes (${pct(s.d.share)})</p>
    <p><span class="swatch" style="background:${R_COLOR}"></span> <strong>${esc(n.rShort)}</strong>: ${fmtCount(s.r.votes)} votes (${pct(s.r.share)})</p>
    <p class="sub">${leadText(s, n, 'here')}</p>`;
}
