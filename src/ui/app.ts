import { aggregateUnits, commonUnits } from '../domain/aggregate.ts';
import { marginSwing } from '../domain/metrics.ts';
import { colorFor } from '../domain/scales.ts';
import type { RaceFile, RaceMeta } from '../domain/types.ts';
import { loadManifest, loadRace, loadTopology, loadUnits } from './data.ts';
import { renderLegend } from './legend.ts';
import { renderMap } from './map.ts';

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

  const swings = computeSwings(raceA, raceB, [...names.keys()].filter((id) => id.startsWith('48')));

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
      <h1>How ${STATE_NAME} shifted: ${metaB.year} ${esc(metaB.office_label)} vs. ${metaA.year} ${esc(metaA.office_label)}</h1>
      <p class="subtitle">Blue = shifted toward Democrats. Red = shifted toward Republicans.</p>
      ${badge}
    </header>
    <div id="map-wrap"></div>
    <div id="legend-wrap"></div>
    <footer id="source">
      <p><strong>Sources:</strong> ${metaA.year} ${esc(metaA.office_label)}: ${esc(metaA.source_label)} (${metaA.status}, as of ${esc(metaA.as_of)}).
      ${metaB.year} ${esc(metaB.office_label)}: ${esc(metaB.source_label)} (${metaB.status}, as of ${esc(metaB.as_of)}).</p>
    </footer>`;

  const svg = renderMap(topo, (id) => {
    const name = names.get(id) ?? id;
    const v = swings.get(id);
    if (v === undefined) return { fill: null, label: `${name} County: missing data` };
    const sign = v > 0 ? '+' : v < 0 ? '−' : '';
    return { fill: colorFor(v), label: `${name} County: swing ${sign}${Math.abs(v).toFixed(2)} pts` };
  });
  root.querySelector('#map-wrap')!.appendChild(svg);
  root.querySelector('#legend-wrap')!.appendChild(renderLegend());
}

/** Margin swing (B − A) per unit; units without both races' data are omitted. */
export function computeSwings(a: RaceFile, b: RaceFile, unitIds: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const id of commonUnits(a, b, unitIds)) {
    const r = marginSwing(aggregateUnits(a, [id]).totals, aggregateUnits(b, [id]).totals);
    if (r.value !== null) out.set(id, r.value);
  }
  return out;
}
