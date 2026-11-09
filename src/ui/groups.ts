// County groups: pure summary of a selection (no DOM) plus the panel that shows it.
import { aggregateCandidate, aggregateUnits, commonUnits } from '../domain/aggregate.ts';
import { fmtCount, fmtMetric, fmtPct, fmtPts, fmtVotes } from '../domain/format.ts';
import {
  candidateChange,
  decomposeShift,
  margin,
  marginSwing,
  rawMargin,
  rawShift,
  turnoutChange,
} from '../domain/metrics.ts';
import type { MetricId, MetricResult, RaceFile, Totals } from '../domain/types.ts';
import { defaultCandidate, notComparable, type ViewSpec } from '../domain/view.ts';
import { METRICS } from './explain.ts';

export interface GroupSummary {
  requested: string[];
  /** Units with usable data in both races; the only ones that are summed. */
  used: string[];
  /** Requested units dropped because one race has no usable data for them. */
  missing: string[];
  a: Totals | null;
  b: Totals | null;
  /** The chosen metric on the group's summed votes. */
  current: MetricResult;
  swing: MetricResult;
  rawShift: MetricResult;
  turnoutPct: MetricResult;
  turnoutRaw: MetricResult;
}

function candId(race: RaceFile, id: string | null): string | null {
  return id !== null && race.candidates.some((c) => c.candidate_id === id) ? id : defaultCandidate(race);
}

/** Sums votes over the units usable in both races, then applies every metric to the sums. */
export function summarizeGroup(spec: ViewSpec, a: RaceFile, b: RaceFile, unitIds: readonly string[]): GroupSummary {
  const used = commonUnits(a, b, unitIds);
  const usedSet = new Set(used);
  const missing = unitIds.filter((u) => !usedSet.has(u));
  const ta = aggregateUnits(a, used).totals;
  const tb = aggregateUnits(b, used).totals;
  const basis = spec.basis;

  const ia = candId(a, spec.candA);
  const ib = candId(b, spec.candB);
  const va = ia === null ? null : aggregateCandidate(a, ia, used).votes;
  const vb = ib === null ? null : aggregateCandidate(b, ib, used).votes;
  const cand = candidateChange(va, vb);

  const t = turnoutChange(ta, tb);
  const one = spec.which === 'A' ? ta : tb;
  let current: MetricResult;
  switch (spec.metric as MetricId) {
    case 'margin':
      current = margin(one, basis);
      break;
    case 'raw_margin':
      current = rawMargin(one);
      break;
    case 'margin_swing':
      current = marginSwing(ta, tb, basis);
      break;
    case 'raw_shift':
      current = rawShift(ta, tb);
      break;
    case 'shift_from_margin':
      current = decomposeShift(ta, tb, basis).margin;
      break;
    case 'shift_from_turnout':
      current = decomposeShift(ta, tb, basis).turnout;
      break;
    case 'candidate_change_raw':
      current = cand.raw;
      break;
    case 'candidate_change_pct':
      current = cand.pct;
      break;
    case 'turnout_change_raw':
      current = t.raw;
      break;
    case 'turnout_change_pct':
      current = t.pct;
      break;
  }
  return {
    requested: [...unitIds],
    used,
    missing,
    a: ta,
    b: tb,
    current,
    swing: marginSwing(ta, tb, basis),
    rawShift: rawShift(ta, tb),
    turnoutPct: t.pct,
    turnoutRaw: t.raw,
  };
}

/** "2 of 5 counties have data", or null when nothing is missing. */
export function disclosure(s: GroupSummary): string | null {
  if (s.missing.length === 0) return null;
  return `${s.used.length} of ${s.requested.length} ${s.requested.length === 1 ? 'county has' : 'counties have'} data in both races.`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export interface GroupContext {
  spec: ViewSpec;
  raceA: RaceFile;
  raceB: RaceFile;
  labelA: string;
  labelB: string;
  unitName: (id: string) => string;
}

export interface GroupPanel {
  /** Toggle one unit in or out of the group. */
  toggle(id: string): void;
  has(id: string): boolean;
  ids(): string[];
  /** Re-render after the metric or race pair changed. */
  refresh(ctx: GroupContext): void;
}

/**
 * Mounts the group panel into `host`. `onChange` runs after the selection changes, so the
 * caller can repaint the map highlight.
 */
export function mountGroupPanel(host: HTMLElement, initial: GroupContext, onChange: (ids: string[]) => void): GroupPanel {
  const selected: string[] = [];
  let ctx = initial;
  let name = '';

  const render = () => {
    const keepFocus = host.contains(document.activeElement) && (document.activeElement as HTMLElement).id === 'group-name';
    if (selected.length === 0) {
      host.innerHTML = `<h2>County group</h2><p class="hint">Click counties on the map (or press Enter on a focused county) to add them to a group.</p>`;
      return;
    }
    const s = summarizeGroup(ctx.spec, ctx.raceA, ctx.raceB, selected);
    const blocked = notComparable(ctx.spec, ctx.raceA, ctx.raceB, ctx.labelA, ctx.labelB);
    const info = METRICS[ctx.spec.metric];
    const cur =
      blocked !== null ? blocked : s.current.value === null ? 'n/a' : fmtMetric(ctx.spec.metric, s.current.value);
    const na = (r: MetricResult, f: (n: number) => string) => (r.value === null ? 'n/a' : f(r.value));
    const note = disclosure(s);
    const list = selected
      .map((id) => {
        const gone = s.missing.includes(id);
        return `<li data-unit="${esc(id)}">${esc(ctx.unitName(id))}${gone ? ' <span class="na">(no data)</span>' : ''} <button type="button" class="remove" data-remove="${esc(id)}" aria-label="Remove ${esc(ctx.unitName(id))} from group">Remove</button></li>`;
      })
      .join('');
    const row = (label: string, t: Totals | null) =>
      `<tr><th scope="row">${esc(label)}</th><td>${t ? fmtCount(t.d) : 'n/a'}</td><td>${t ? fmtCount(t.r) : 'n/a'}</td><td>${t ? fmtCount(t.t) : 'n/a'}</td></tr>`;
    host.innerHTML = `
      <h2>${name ? esc(name) : 'County group'}</h2>
      <label>Group name (optional) <input id="group-name" type="text" maxlength="60" value="${esc(name)}"></label>
      <ul id="group-list">${list}</ul>
      <button type="button" id="group-clear">Clear group</button>
      ${note ? `<p id="group-missing" class="notice" role="status">${esc(note)} Missing: ${s.missing.map((m) => esc(ctx.unitName(m))).join(', ')}.</p>` : ''}
      <p id="group-current"><strong>${esc(info.label)}:</strong> <span id="group-value">${esc(cur)}</span></p>
      <table class="group-votes">
        <thead><tr><th scope="col">Race</th><th scope="col">D</th><th scope="col">R</th><th scope="col">Total</th></tr></thead>
        <tbody>${row(ctx.labelA, s.a)}${row(ctx.labelB, s.b)}</tbody>
      </table>
      <ul class="group-all">
        <li><strong>Margin swing:</strong> <span id="group-swing">${esc(na(s.swing, fmtPts))}</span></li>
        <li><strong>Raw margin shift:</strong> <span id="group-raw">${esc(na(s.rawShift, fmtVotes))}</span></li>
        <li><strong>Turnout change:</strong> <span id="group-turnout">${esc(na(s.turnoutPct, fmtPct))}</span></li>
      </ul>
      <p class="sub">Votes are summed across the counties first; percentages are computed from the sums.</p>`;
    if (keepFocus) {
      const input = host.querySelector<HTMLInputElement>('#group-name')!;
      input.focus();
      input.setSelectionRange(name.length, name.length);
    }
  };

  host.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const rm = t.closest<HTMLElement>('[data-remove]');
    if (rm) {
      api.toggle(rm.dataset.remove!);
      return;
    }
    if (t.closest('#group-clear')) {
      selected.length = 0;
      name = '';
      render();
      onChange([]);
    }
  });
  host.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'group-name') {
      name = t.value;
      const h = host.querySelector('h2');
      if (h) h.textContent = name || 'County group';
    }
  });

  const api: GroupPanel = {
    toggle(id) {
      const i = selected.indexOf(id);
      if (i >= 0) selected.splice(i, 1);
      else selected.push(id);
      if (selected.length === 0) name = '';
      render();
      onChange([...selected]);
    },
    has: (id) => selected.includes(id),
    ids: () => [...selected],
    refresh(next) {
      ctx = next;
      render();
    },
  };
  render();
  return api;
}
