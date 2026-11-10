import type { Basis, MetricId, RaceFile } from '../domain/types.ts';
import { titleCase } from '../domain/format.ts';
import {
  BASIS_METRICS,
  CANDIDATE_METRICS,
  METRIC_IDS,
  SINGLE_RACE_METRICS,
  defaultCandidate,
  type ViewSpec,
} from '../domain/view.ts';
import { METRICS } from './explain.ts';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function candidateOptions(race: RaceFile, selected: string | null): string {
  return race.candidates
    .map(
      (c) =>
        `<option value="${esc(c.candidate_id)}"${c.candidate_id === selected ? ' selected' : ''}>${esc(titleCase(c.name))} (${esc(c.party)})</option>`,
    )
    .join('');
}

export interface ControlLabels {
  a: string;
  b: string;
}

/**
 * Builds the control panel and wires it to `onChange`. Returns a function that
 * syncs the controls (shown/hidden groups, definition text) to a spec.
 */
export function renderControls(
  el: HTMLElement,
  spec: ViewSpec,
  raceA: RaceFile,
  raceB: RaceFile,
  labels: ControlLabels,
  onChange: (next: ViewSpec) => void,
): (spec: ViewSpec) => void {
  const candA = spec.candA ?? defaultCandidate(raceA);
  const candB = spec.candB ?? defaultCandidate(raceB);
  el.innerHTML = `
    <div class="row">
      <label for="metric">Metric</label>
      <select id="metric">${METRIC_IDS.map(
        (m) => `<option value="${m}"${m === spec.metric ? ' selected' : ''}>${esc(METRICS[m].label)}</option>`,
      ).join('')}</select>
    </div>
    <p id="definition" class="definition"></p>
    <fieldset id="basis-group" class="row">
      <legend>Vote basis</legend>
      <label><input type="radio" name="basis" value="total"${spec.basis === 'total' ? ' checked' : ''}> All votes</label>
      <label><input type="radio" name="basis" value="two_party"${spec.basis === 'two_party' ? ' checked' : ''}> Two-party (D + R)</label>
    </fieldset>
    <div id="which-group" class="row">
      <label for="which">Race</label>
      <select id="which">
        <option value="A"${spec.which === 'A' ? ' selected' : ''}>${esc(labels.a)}</option>
        <option value="B"${spec.which === 'B' ? ' selected' : ''}>${esc(labels.b)}</option>
      </select>
    </div>
    <div id="cand-group" class="row">
      <label for="cand-a">${esc(labels.a)} candidate</label>
      <select id="cand-a">${candidateOptions(raceA, candA)}</select>
      <label for="cand-b">${esc(labels.b)} candidate</label>
      <select id="cand-b">${candidateOptions(raceB, candB)}</select>
    </div>`;

  let current = spec;
  const q = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
  const emit = (patch: Partial<ViewSpec>) => {
    current = { ...current, ...patch };
    onChange(current);
  };
  q<HTMLSelectElement>('#metric').addEventListener('change', (e) =>
    emit({ metric: (e.target as HTMLSelectElement).value as MetricId }),
  );
  el.querySelectorAll<HTMLInputElement>('input[name="basis"]').forEach((i) =>
    i.addEventListener('change', () => emit({ basis: i.value as Basis })),
  );
  q<HTMLSelectElement>('#which').addEventListener('change', (e) =>
    emit({ which: (e.target as HTMLSelectElement).value as 'A' | 'B' }),
  );
  q<HTMLSelectElement>('#cand-a').addEventListener('change', (e) =>
    emit({ candA: (e.target as HTMLSelectElement).value }),
  );
  q<HTMLSelectElement>('#cand-b').addEventListener('change', (e) =>
    emit({ candB: (e.target as HTMLSelectElement).value }),
  );

  return (s: ViewSpec) => {
    current = s;
    q<HTMLSelectElement>('#metric').value = s.metric;
    q<HTMLSelectElement>('#cand-a').value = s.candA ?? defaultCandidate(raceA) ?? '';
    q<HTMLSelectElement>('#cand-b').value = s.candB ?? defaultCandidate(raceB) ?? '';
    q<HTMLElement>('#definition').textContent = METRICS[s.metric].define(labels.a, labels.b);
    q<HTMLElement>('#basis-group').hidden = !BASIS_METRICS.has(s.metric);
    q<HTMLElement>('#which-group').hidden = !SINGLE_RACE_METRICS.has(s.metric);
    q<HTMLElement>('#cand-group').hidden = !CANDIDATE_METRICS.has(s.metric);
  };
}
