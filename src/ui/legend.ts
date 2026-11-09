import { fmtCount } from '../domain/format.ts';
import { binsForScale, type ScaleSpec } from '../domain/scales.ts';
import { BASIS_NOTE, METRICS } from './explain.ts';
import type { Basis, MetricId } from '../domain/types.ts';
import { BASIS_METRICS } from '../domain/view.ts';

const UNIT_TITLE: Record<ScaleSpec['unit'], string> = {
  pts: 'percentage points',
  pct: 'percent',
  votes: 'votes',
};

function edgeFormatter(unit: ScaleSpec['unit']): (n: number) => string {
  if (unit === 'pct') return (n) => `${n}%`;
  if (unit === 'votes') return (n) => fmtCount(n);
  return (n) => String(n);
}

export function renderLegend(
  metric: MetricId,
  spec: ScaleSpec,
  basis: Basis,
  labelA: string,
  labelB: string,
): HTMLElement {
  const el = document.createElement('section');
  el.id = 'legend';
  el.setAttribute('aria-label', 'Legend');
  const info = METRICS[metric];
  const rows = binsForScale(spec, edgeFormatter(spec.unit))
    .map(
      (b) =>
        `<li><span class="swatch" style="background:${b.color}"></span><span>${b.label}</span></li>`,
    )
    .join('');
  const cls = spec.palette === 'partisan' ? ['red', 'blue'] : ['purple', 'green'];
  const notes: string[] = [];
  if (BASIS_METRICS.has(metric)) notes.push(BASIS_NOTE[basis]);
  if (spec.unit === 'votes') notes.push('Raw-vote bins are set from the largest value in this view, so they change with the metric.');
  else notes.push('Bins are fixed so maps stay comparable.');
  el.innerHTML = `
    <h2>${info.label} (${UNIT_TITLE[spec.unit]})</h2>
    <p class="dir"><span class="${cls[0]}">${info.direction.neg}</span> · <span class="${cls[1]}">${info.direction.pos}</span></p>
    <ul>${rows}<li><span class="swatch hatch"></span><span>Missing</span></li></ul>
    <p class="note">${info.define(labelA, labelB)} ${notes.join(' ')}</p>`;
  return el;
}
