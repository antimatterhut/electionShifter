import { aggregateUnits, commonUnits } from '../domain/aggregate.ts';
import { fmtMetric } from '../domain/format.ts';
import { raceLabel } from '../domain/races.ts';
import { colorForScale } from '../domain/scales.ts';
import type { RaceFile, RaceMeta } from '../domain/types.ts';
import {
  metricValue,
  notComparable,
  scaleFor,
  turnoutNotice,
  unitDetail,
  type ViewSpec,
} from '../domain/view.ts';
import { parseUrlState, type UrlState } from '../domain/urlState.ts';
import { renderControls } from './controls.ts';
import { mountGroupPanel, type GroupPanel } from './groups.ts';
import { loadManifest, loadRace, loadTopology, loadUnits } from './data.ts';
import { METRICS } from './explain.ts';
import { renderLegend } from './legend.ts';
import { paintMap, renderMap } from './map.ts';
import { renderRacePicker, type RacePair } from './racepicker.ts';
import { mountShare } from './share.ts';
import { renderTable } from './table.ts';
import { attachTooltip, nameLookup, tooltipHtml } from './tooltip.ts';

// Default pair when the page opens. Race ids only, never candidate names.
const DEFAULT_A = '2024-TX-president-gen';
const DEFAULT_B = '2026-TX-us-senate-gen';
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

interface Pair {
  metaA: RaceMeta;
  metaB: RaceMeta;
  raceA: RaceFile;
  raceB: RaceFile;
  labelA: string;
  labelB: string;
}

async function render(root: HTMLElement): Promise<void> {
  const manifest = await loadManifest();
  const races = manifest.races.filter((r) => r.state_po === STATE);
  const [units, topo] = await Promise.all([loadUnits(), loadTopology(STATE)]);
  const names = new Map(units.map((u) => [u.unit_id, u.name]));
  const unitIds = [...names.keys()].filter((id) => id.startsWith('48'));
  const unitName = (id: string) => names.get(id) ?? id;

  root.innerHTML = `
    <header>
      <h1 id="title"></h1>
      <p id="subtitle" class="subtitle"></p>
      <span id="badge"></span>
    </header>
    <section id="picker" aria-label="Choose two races"></section>
    <section id="controls" aria-label="Controls"></section>
    <section id="share" aria-label="Share this view"></section>
    <aside id="url-notice" class="notice" role="status" hidden></aside>
    <aside id="notice" class="notice" role="note" hidden></aside>
    <p id="not-comparable" class="notice" role="status" hidden></p>
    <div id="map-wrap"><div id="tooltip" role="tooltip" hidden></div></div>
    <div id="legend-wrap"></div>
    <section id="group" aria-label="County group"></section>
    <details id="table-wrap"><summary>Data table</summary><div id="table"></div></details>
    <footer id="source"></footer>`;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;

  const cache = new Map<string, Promise<RaceFile>>();
  const raceFile = (m: RaceMeta) => {
    let p = cache.get(m.race_id);
    if (p === undefined) {
      p = loadRace(m);
      cache.set(m.race_id, p);
      p.catch(() => cache.delete(m.race_id));
    }
    return p;
  };

  const parsed = parseUrlState(window.location.search, {
    races: races.map((r) => r.race_id),
    units: unitIds,
    states: [STATE],
    defaults: { a: DEFAULT_A, b: DEFAULT_B, state: STATE },
  });
  const urlNotices = [...parsed.notices];
  const initial = parsed.state;
  const share = mountShare($('#share'));
  const showUrlNotices = () => {
    const el = $('#url-notice');
    el.hidden = urlNotices.length === 0;
    el.textContent = urlNotices.join(' ');
  };
  const writeUrl = () => {
    if (pair === undefined || group === undefined) return;
    const s: UrlState = {
      a: pair.metaA.race_id,
      b: pair.metaB.race_id,
      metric: spec.metric,
      basis: spec.basis,
      which: spec.which,
      state: STATE,
      candA: spec.candA,
      candB: spec.candB,
      group: group.ids(),
      groupName: group.name(),
      mode: initial.mode,
    };
    share.set(s);
  };

  let pair!: Pair;
  let spec: ViewSpec = {
    metric: initial.metric,
    basis: initial.basis,
    which: initial.which,
    candA: initial.candA,
    candB: initial.candB,
  };
  let firstLoad = true;
  let noticeText: string | null = null;
  let syncControls: (s: ViewSpec) => void = () => {};

  const svg = renderMap(topo, () => ({ fill: null, label: '' }));
  $('#map-wrap').appendChild(svg);
  attachTooltip(svg, $('#tooltip'), (id) =>
    tooltipHtml(unitName(id), unitDetail(spec, pair.raceA, pair.raceB, id), {
      a: pair.labelA,
      b: pair.labelB,
      nameA: nameLookup(pair.raceA.candidates),
      nameB: nameLookup(pair.raceB.candidates),
    }),
  );
  const updateTable = renderTable($('#table'));

  const groupCtx = () => ({
    spec,
    raceA: pair.raceA,
    raceB: pair.raceB,
    labelA: pair.labelA,
    labelB: pair.labelB,
    unitName,
  });
  let group!: GroupPanel;
  const highlight = (ids: string[]) => {
    writeUrl();
    const on = new Set(ids);
    for (const p of svg.querySelectorAll<SVGPathElement>('path[data-unit]')) {
      const sel = on.has(p.dataset.unit!);
      p.toggleAttribute('data-selected', sel);
      p.setAttribute('stroke', sel ? '#000' : '#fff');
      p.setAttribute('stroke-width', sel ? '2' : '0.5');
    }
  };
  svg.addEventListener('click', (e) => {
    const p = (e.target as Element).closest?.('path[data-unit]') as SVGPathElement | null;
    if (p) group.toggle(p.dataset.unit!);
  });
  svg.addEventListener('keydown', (e) => {
    const p = (e.target as Element).closest?.('path[data-unit]') as SVGPathElement | null;
    if (p && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      group.toggle(p.dataset.unit!);
    }
  });

  let token = 0;
  async function showPair(ids: RacePair): Promise<void> {
    const mine = ++token;
    const metaA = find(races, ids.a);
    const metaB = find(races, ids.b);
    const [raceA, raceB] = await Promise.all([raceFile(metaA), raceFile(metaB)]);
    if (mine !== token) return; // a newer pick superseded this one
    pair = { metaA, metaB, raceA, raceB, labelA: raceLabel(metaA), labelB: raceLabel(metaB) };
    const { labelA, labelB } = pair;

    const sameYear = metaA.year === metaB.year;
    $('#title').textContent = sameYear
      ? `How ${STATE_NAME} voted differently: ${labelB} vs. ${labelA}`
      : `How ${STATE_NAME} shifted: ${labelB} vs. ${labelA}`;

    // Mixed status: unofficial if either race is.
    const unofficial = metaA.status === 'unofficial' || metaB.status === 'unofficial';
    const asOf = [metaA, metaB]
      .filter((m) => m.status === 'unofficial')
      .map((m) => m.as_of)
      .sort()
      .pop();
    $('#badge').innerHTML = unofficial
      ? `<span class="badge unofficial">UNOFFICIAL as of ${esc(asOf ?? '')}</span>`
      : `<span class="badge certified">CERTIFIED</span>`;

    const note = (m: RaceMeta) => (m.method_note ? ` ${esc(m.method_note)}` : '');
    $('#source').innerHTML = `<p><strong>Sources:</strong> ${esc(labelA)}: ${esc(metaA.source_label)} (${metaA.status}, as of ${esc(metaA.as_of)}).${note(metaA)}
      ${esc(labelB)}: ${esc(metaB.source_label)} (${metaB.status}, as of ${esc(metaB.as_of)}).${note(metaB)}</p>`;

    // Turnout notice depends on the races and units in view, not on the metric.
    const common = commonUnits(raceA, raceB, unitIds);
    noticeText = turnoutNotice(
      metaA,
      metaB,
      aggregateUnits(raceA, common).totals?.t ?? 0,
      aggregateUnits(raceB, common).totals?.t ?? 0,
    );

    if (firstLoad) {
      // Candidates from the link must exist in their race; otherwise fall back to the default.
      const has = (r: RaceFile, c: string | null) => c === null || r.candidates.some((x) => x.candidate_id === c);
      if (!has(raceA, spec.candA) || !has(raceB, spec.candB)) {
        urlNotices.push('Ignored a candidate in the link that is not in these races.');
        spec = { ...spec, candA: has(raceA, spec.candA) ? spec.candA : null, candB: has(raceB, spec.candB) ? spec.candB : null };
      }
    } else {
      spec = { ...spec, candA: null, candB: null };
    }
    syncControls = renderControls($('#controls'), spec, raceA, raceB, { a: labelA, b: labelB }, (next) => {
      spec = next;
      update();
    });
    if (group === undefined) {
      group = mountGroupPanel($('#group'), groupCtx(), highlight, { ids: initial.group, name: initial.groupName });
      highlight(group.ids());
    }
    firstLoad = false;
    showUrlNotices();
    update();
  }

  function update(): void {
    const { raceA, raceB, labelA, labelB } = pair;
    syncControls(spec);
    const info = METRICS[spec.metric];
    $('#subtitle').textContent = info.colors;

    const blocked = notComparable(spec, raceA, raceB, labelA, labelB);
    const msg = $('#not-comparable');
    msg.hidden = blocked === null;
    msg.textContent = blocked ?? '';

    const values = new Map<string, number | null>();
    for (const id of unitIds) values.set(id, blocked === null ? metricValue(spec, raceA, raceB, id).value : null);
    const scale = scaleFor(
      spec.metric,
      [...values.values()].filter((v): v is number => v !== null),
    );

    paintMap(svg, (id) => {
      const v = values.get(id);
      const name = unitName(id);
      if (blocked !== null) return { fill: null, label: `${name} County: ${blocked}` };
      if (v === null || v === undefined) return { fill: null, label: `${name} County: missing data` };
      const text = fmtMetric(spec.metric, v);
      return { fill: colorForScale(v, scale), label: `${name} County: ${info.short} ${text}` };
    });

    $('#legend-wrap').replaceChildren(
      blocked === null ? renderLegend(spec.metric, scale, spec.basis, labelA, labelB) : document.createElement('div'),
    );

    updateTable(
      unitIds.map((id) => {
        const v = values.get(id) ?? null;
        return {
          id,
          name: unitName(id),
          value: v,
          text: blocked !== null ? 'Not comparable' : v === null ? 'Missing' : fmtMetric(spec.metric, v),
        };
      }),
      info.label,
    );

    group.refresh(groupCtx());
    writeUrl();

    const notice = $('#notice');
    const showNotice = noticeText !== null;
    notice.hidden = !showNotice;
    if (showNotice) {
      const turnoutView = spec.metric === 'turnout_change_pct';
      notice.innerHTML = `${esc(noticeText ?? '')} ${
        turnoutView ? '' : '<button type="button" id="goto-turnout">Show the Turnout view</button>'
      }`;
      notice.querySelector('#goto-turnout')?.addEventListener('click', () => {
        spec = { ...spec, metric: 'turnout_change_pct' };
        update();
      });
    }
  }

  let ids: RacePair = { a: initial.a, b: initial.b };
  renderRacePicker($('#picker'), races, ids, (next) => {
    ids = next;
    showPair(ids).catch((e) => {
      $('#not-comparable').hidden = false;
      $('#not-comparable').textContent = `Could not load those races: ${String(e)}`;
    });
  });
  await showPair(ids);
}
