import { aggregateUnits, commonUnits } from '../domain/aggregate.ts';
import { fmtMetric } from '../domain/format.ts';
import { colorForScale } from '../domain/scales.ts';
import type { RaceMeta } from '../domain/types.ts';
import {
  metricValue,
  scaleFor,
  turnoutNotice,
  unitDetail,
  type ViewSpec,
} from '../domain/view.ts';
import { renderControls } from './controls.ts';
import { loadManifest, loadRace, loadTopology, loadUnits } from './data.ts';
import { METRICS } from './explain.ts';
import { renderLegend } from './legend.ts';
import { paintMap, renderMap } from './map.ts';
import { renderTable } from './table.ts';
import { attachTooltip, nameLookup, tooltipHtml } from './tooltip.ts';

// First slice: fixed pair. Race selection arrives in Phase 7.
const RACE_A = '2024-TX-president-gen';
const RACE_B = '2026-TX-us-senate-gen';
const STATE = 'TX';
const STATE_NAME = 'Texas';

function find(races: RaceMeta[], id: string): RaceMeta {
  const m = races.find((r) => r.race_id === id);
  if (!m) throw new Error(`Race not in manifest: ${id}`);
  return m;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export async function start(root: HTMLElement): Promise<void> {
  try {
    await render(root);
  } catch (e) {
    root.innerHTML = `<p class="error" role="alert">Could not load the map: ${esc(String(e))}</p>`;
    throw e;
  }
}

async function render(root: HTMLElement): Promise<void> {
  const manifest = await loadManifest();
  const metaA = find(manifest.races, RACE_A);
  const metaB = find(manifest.races, RACE_B);
  const [raceA, raceB, units, topo] = await Promise.all([
    loadRace(metaA),
    loadRace(metaB),
    loadUnits(),
    loadTopology(STATE),
  ]);
  const names = new Map(units.map((u) => [u.unit_id, u.name]));
  const unitIds = [...names.keys()].filter((id) => id.startsWith('48'));
  const labelA = `${metaA.year} ${metaA.office_label}`;
  const labelB = `${metaB.year} ${metaB.office_label}`;

  // Mixed status: unofficial if either race is.
  const unofficial = metaA.status === 'unofficial' || metaB.status === 'unofficial';
  const asOf = [metaA, metaB]
    .filter((m) => m.status === 'unofficial')
    .map((m) => m.as_of)
    .sort()
    .pop();
  const badge = unofficial
    ? `<span class="badge unofficial">UNOFFICIAL as of ${esc(asOf ?? '')}</span>`
    : `<span class="badge certified">CERTIFIED</span>`;

  root.innerHTML = `
    <header>
      <h1>How ${STATE_NAME} shifted: ${esc(labelB)} vs. ${esc(labelA)}</h1>
      <p id="subtitle" class="subtitle"></p>
      ${badge}
    </header>
    <section id="controls" aria-label="Controls"></section>
    <aside id="notice" class="notice" role="note" hidden></aside>
    <div id="map-wrap"><div id="tooltip" role="tooltip" hidden></div></div>
    <div id="legend-wrap"></div>
    <details id="table-wrap"><summary>Data table</summary><div id="table"></div></details>
    <footer id="source">
      <p><strong>Sources:</strong> ${esc(labelA)}: ${esc(metaA.source_label)} (${metaA.status}, as of ${esc(metaA.as_of)}).
      ${esc(labelB)}: ${esc(metaB.source_label)} (${metaB.status}, as of ${esc(metaB.as_of)}).</p>
    </footer>`;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;

  // Turnout notice: depends on the races and the units in view, not on the metric.
  const common = commonUnits(raceA, raceB, unitIds);
  const noticeText = turnoutNotice(
    metaA,
    metaB,
    aggregateUnits(raceA, common).totals?.t ?? 0,
    aggregateUnits(raceB, common).totals?.t ?? 0,
  );

  let spec: ViewSpec = { metric: 'margin_swing', basis: 'total', which: 'B', candA: null, candB: null };
  const tooltipLabels = {
    a: labelA,
    b: labelB,
    nameA: nameLookup(raceA.candidates),
    nameB: nameLookup(raceB.candidates),
  };
  const unitName = (id: string) => names.get(id) ?? id;

  const svg = renderMap(topo, () => ({ fill: null, label: '' }));
  $('#map-wrap').appendChild(svg);
  attachTooltip(svg, $('#tooltip'), (id) =>
    tooltipHtml(unitName(id), unitDetail(spec, raceA, raceB, id), tooltipLabels),
  );
  const updateTable = renderTable($('#table'));

  const sync = renderControls($('#controls'), spec, raceA, raceB, { a: labelA, b: labelB }, (next) => {
    spec = next;
    update();
  });

  function update(): void {
    sync(spec);
    const info = METRICS[spec.metric];
    $('#subtitle').textContent = info.colors;

    const values = new Map<string, number | null>();
    for (const id of unitIds) values.set(id, metricValue(spec, raceA, raceB, id).value);
    const scale = scaleFor(
      spec.metric,
      [...values.values()].filter((v): v is number => v !== null),
    );

    paintMap(svg, (id) => {
      const v = values.get(id);
      const name = unitName(id);
      if (v === null || v === undefined) return { fill: null, label: `${name} County: missing data` };
      const text = fmtMetric(spec.metric, v);
      return { fill: colorForScale(v, scale), label: `${name} County: ${info.short} ${text}` };
    });

    const legendWrap = $('#legend-wrap');
    legendWrap.replaceChildren(renderLegend(spec.metric, scale, spec.basis, labelA, labelB));

    updateTable(
      unitIds.map((id) => {
        const v = values.get(id) ?? null;
        return {
          id,
          name: unitName(id),
          value: v,
          text: v === null ? 'Missing' : fmtMetric(spec.metric, v),
        };
      }),
      info.label,
    );

    const notice = $('#notice');
    const showNotice = noticeText !== null;
    notice.hidden = !showNotice;
    if (showNotice) {
      const turnoutView = spec.metric === 'turnout_change_pct';
      notice.innerHTML = `${esc(noticeText)} ${
        turnoutView ? '' : '<button type="button" id="goto-turnout">Show the Turnout view</button>'
      }`;
      notice.querySelector('#goto-turnout')?.addEventListener('click', () => {
        spec = { ...spec, metric: 'turnout_change_pct' };
        update();
      });
    }
  }

  update();
}
