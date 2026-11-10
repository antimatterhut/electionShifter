// Statewide vote totals per candidate, plus a head-to-head line for the two chosen candidates.
import { fmtCount, titleCase } from '../domain/format.ts';
import { headToHeadSummary, pairTotals, votesFor, type RaceTotals } from '../domain/totals.ts';
import type { RaceFile } from '../domain/types.ts';
import { defaultCandidate } from '../domain/view.ts';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export interface TotalsContext {
  raceA: RaceFile;
  raceB: RaceFile;
  labelA: string;
  labelB: string;
  unitIds: readonly string[];
  candA: string | null;
  candB: string | null;
  stateName: string;
}

const candName = (race: RaceFile, id: string | null) => {
  const c = race.candidates.find((x) => x.candidate_id === id);
  return c ? `${titleCase(c.name)} (${c.party})` : null;
};

function table(label: string, t: RaceTotals, chosen: string | null): string {
  const rows = t.rows
    .map(
      (r) =>
        `<tr${r.candidateId === chosen ? ' class="chosen"' : ''}><th scope="row">${esc(titleCase(r.name))} <span class="party">(${esc(r.party)})</span></th><td>${fmtCount(r.votes)}</td><td>${r.share === null ? 'n/a' : r.share.toFixed(1) + '%'}</td></tr>`,
    )
    .join('');
  return `<table class="totals-table"><caption>${esc(label)}</caption>
    <thead><tr><th scope="col">Candidate</th><th scope="col">Votes</th><th scope="col">Share</th></tr></thead>
    <tbody>${rows}<tr class="all"><th scope="row">All votes cast</th><td>${fmtCount(t.total)}</td><td></td></tr></tbody></table>`;
}

/** Renders into `host`. `onPick` runs when the user changes a head-to-head candidate. */
export function renderTotals(host: HTMLElement, ctx: TotalsContext, onPick: (side: 'A' | 'B', id: string) => void): void {
  const t = pairTotals(ctx.raceA, ctx.raceB, ctx.unitIds);
  const ia = ctx.candA ?? defaultCandidate(ctx.raceA);
  const ib = ctx.candB ?? defaultCandidate(ctx.raceB);
  const va = votesFor(t.a, ia);
  const vb = votesFor(t.b, ib);
  const na = candName(ctx.raceA, ia);
  const nb = candName(ctx.raceB, ib);

  const opts = (race: RaceFile, sel: string | null) =>
    race.candidates
      .map((c) => `<option value="${esc(c.candidate_id)}"${c.candidate_id === sel ? ' selected' : ''}>${esc(titleCase(c.name))} (${esc(c.party)})</option>`)
      .join('');

  const nameOf = (race: RaceFile, id: string | null) => {
    const c = race.candidates.find((x) => x.candidate_id === id);
    return c ? titleCase(c.name) : '';
  };
  const A = `${nameOf(ctx.raceA, ia)} (${ctx.labelA})`;
  const B = `${nameOf(ctx.raceB, ib)} (${ctx.labelB})`;
  let verdict = 'Pick a candidate in each race to compare their vote totals.';
  let hypo = '';
  const h = headToHeadSummary(ctx.raceA, ctx.raceB, { candA: ia, candB: ib }, ctx.unitIds);
  if (h !== null) {
    const dIsA = h.dFrom === 'A';
    const nameD = dIsA ? A : B;
    const nameR = dIsA ? B : A;
    const lead = h.rawMargin === 0 ? null : h.rawMargin > 0 ? 'd' : 'r';
    const winName = lead === 'd' ? nameD : nameR;
    verdict =
      lead === null
        ? `Hypothetical ${nameD} vs. ${nameR}: an exact tie at ${fmtCount(h.d.votes)} votes each.`
        : `Hypothetical ${nameD} vs. ${nameR}: ${winName} would win ${ctx.stateName} by ${fmtCount(Math.abs(h.rawMargin))} votes (${Math.abs(h.margin).toFixed(1)} points).`;
    hypo = `<table class="hypo-table"><caption>Hypothetical head-to-head (their combined votes)</caption>
      <thead><tr><th scope="col">Candidate</th><th scope="col">Votes</th><th scope="col">Share</th><th scope="col">Counties won</th></tr></thead>
      <tbody>
        <tr class="d"><th scope="row">${esc(nameD)}</th><td>${fmtCount(h.d.votes)}</td><td>${h.d.share.toFixed(1)}%</td><td>${h.d.counties}</td></tr>
        <tr class="r"><th scope="row">${esc(nameR)}</th><td>${fmtCount(h.r.votes)}</td><td>${h.r.share.toFixed(1)}%</td><td>${h.r.counties}</td></tr>
      </tbody></table>`;
  } else if (va !== null && vb !== null) {
    const diff = va - vb;
    verdict =
      diff === 0
        ? `${A} and ${B} have exactly the same number of votes: ${fmtCount(va)}.`
        : `${diff > 0 ? A : B} has ${fmtCount(Math.abs(diff))} more votes: ${fmtCount(diff > 0 ? va : vb)} to ${fmtCount(diff > 0 ? vb : va)}.`;
  }
  const missing = t.requested - t.used;
  host.innerHTML = `
    <h2>Total votes, ${esc(ctx.stateName)}</h2>
    <div class="row">
      <label for="tot-a">${esc(ctx.labelA)} candidate</label>
      <select id="tot-a">${opts(ctx.raceA, ia)}</select>
      <label for="tot-b">${esc(ctx.labelB)} candidate</label>
      <select id="tot-b">${opts(ctx.raceB, ib)}</select>
    </div>
    <p id="totals-verdict"><strong>${esc(verdict)}</strong></p>
    ${hypo}
    <div class="totals-grid">${table(ctx.labelA, t.a, ia)}${table(ctx.labelB, t.b, ib)}</div>
    <p class="sub">This is a what-if built from two different elections: each candidate's real votes, with no adjustment for turnout differences between the years.${
      missing > 0 ? ` Counted over the ${t.used} of ${t.requested} counties with data in both races.` : ` All ${t.used} counties counted.`
    }</p>`;
  host.querySelector('#tot-a')!.addEventListener('change', (e) => onPick('A', (e.target as HTMLSelectElement).value));
  host.querySelector('#tot-b')!.addEventListener('change', (e) => onPick('B', (e.target as HTMLSelectElement).value));
}
