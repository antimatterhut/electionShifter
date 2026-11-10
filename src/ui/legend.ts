import { fmtCount } from '../domain/format.ts';
import { binsForScale, gradientLegend, type ScaleSpec } from '../domain/scales.ts';
import { BASIS_NOTE, METRICS } from './explain.ts';
import type { Basis, MetricId } from '../domain/types.ts';
import { BASIS_METRICS, CANDIDATE_METRICS } from '../domain/view.ts';

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

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function renderLegend(
  metric: MetricId,
  spec: ScaleSpec,
  basis: Basis,
  labelA: string,
  labelB: string,
  cands?: { a: string; b: string },
): HTMLElement {
  const el = document.createElement('section');
  el.id = 'legend';
  el.setAttribute('aria-label', 'Legend');
  const info = METRICS[metric];
  const fmt = edgeFormatter(spec.unit);
  let scaleHtml: string;
  if (spec.continuous) {
    const g = gradientLegend(spec);
    const css = g.stops.map((x) => `${x.color} ${(x.pos * 100).toFixed(1)}%`).join(', ');
    const ticks = g.ticks
      .map((t) => {
        const label = t.value === 0 ? '0' : (t.value < 0 ? '−' : '+') + fmt(Math.abs(t.value));
        return `<span class="tick" style="left:${(t.pos * 100).toFixed(2)}%">${label}</span>`;
      })
      .join('');
    scaleHtml = `<div class="gradient" role="img" aria-label="Color scale from ${fmt(spec.continuous.max)} votes in the negative direction to ${fmt(spec.continuous.max)} in the positive direction, spaced logarithmically"><div class="bar" style="background:linear-gradient(to right, ${css})"></div><div class="ticks">${ticks}</div></div>
    <ul><li><span class="swatch hatch"></span><span>Missing</span></li></ul>`;
  } else {
    const rows = binsForScale(spec, fmt)
      .map((b) => `<li><span class="swatch" style="background:${b.color}"></span><span>${b.label}</span></li>`)
      .join('');
    scaleHtml = `<ul>${rows}<li><span class="swatch hatch"></span><span>Missing</span></li></ul>`;
  }
  const cls = spec.palette === 'partisan' ? ['red', 'blue'] : ['purple', 'green'];
  const notes: string[] = [];
  if (BASIS_METRICS.has(metric)) notes.push(BASIS_NOTE[basis]);
  if (spec.unit === 'votes') notes.push('Raw-vote colors blend smoothly on a log-style scale (each tick is 10 times the last) that ends at the largest value in this view, so they change with the metric.');
  else notes.push('Bins are fixed so maps stay comparable.');
  let neg = info.direction.neg;
  let pos = info.direction.pos;
  let who = '';
  if (cands && CANDIDATE_METRICS.has(metric)) {
    const from = `${cands.a} (${labelA})`;
    const to = `${cands.b} (${labelB})`;
    neg = `◀ ${to} got fewer votes than ${from} (purple)`;
    pos = `${to} got more votes than ${from} (green) ▶`;
    who = `<p class="who">Green counties: ${esc(cands.b)} did better than ${esc(cands.a)}. Purple counties: ${esc(cands.b)} did worse than ${esc(cands.a)}.</p>`;
  }
  el.innerHTML = `
    <h2>${info.label} (${UNIT_TITLE[spec.unit]})</h2>
    <p class="dir"><span class="${cls[0]}">${esc(neg)}</span> · <span class="${cls[1]}">${esc(pos)}</span></p>
    ${who}
    ${scaleHtml}
    <p class="note">${info.define(labelA, labelB)} ${notes.join(' ')}</p>`;
  return el;
}
