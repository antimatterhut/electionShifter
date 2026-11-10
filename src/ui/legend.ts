import { fmtCount } from '../domain/format.ts';
import { binsForScale, gradientLegend, type ScaleSpec } from '../domain/scales.ts';
import { BASIS_NOTE, METRICS } from './explain.ts';
import type { Basis, MetricId } from '../domain/types.ts';
import type { Bin } from '../domain/scales.ts';
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

export interface LegendModel {
  title: string;
  neg: string;
  pos: string;
  /** colour class names for the neg and pos phrases */
  cls: [string, string];
  who: string;
  bins: Bin[] | null;
  gradient: { stops: { pos: number; color: string }[]; ticks: { pos: number; label: string }[] } | null;
  notes: string[];
}

/** Plain-data legend, shared by the on-page legend and the PNG export. */
export function legendModel(
  metric: MetricId,
  spec: ScaleSpec,
  basis: Basis,
  labelA: string,
  labelB: string,
  cands?: { a: string; b: string; d?: string; r?: string },
): LegendModel {
  const info = METRICS[metric];
  const fmt = edgeFormatter(spec.unit);
  let bins: Bin[] | null = null;
  let gradient: LegendModel['gradient'] = null;
  if (spec.continuous) {
    const g = gradientLegend(spec);
    gradient = {
      stops: g.stops,
      ticks: g.ticks.map((t) => ({
        pos: t.pos,
        label: t.value === 0 ? '0' : (t.value < 0 ? '−' : '+') + fmt(Math.abs(t.value)),
      })),
    };
  } else {
    bins = binsForScale(spec, fmt);
  }
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
    who = `Green counties: ${cands.b} did better than ${cands.a}. Purple counties: ${cands.b} did worse than ${cands.a}.`;
  }
  if (metric === 'head_to_head' && cands?.d && cands.r) {
    neg = `◀ ${cands.r} leads (red)`;
    pos = `${cands.d} leads (blue) ▶`;
    who = `Red counties: ${cands.r} gets more votes. Blue counties: ${cands.d} gets more votes.`;
  }
  return {
    title: `${info.label} (${UNIT_TITLE[spec.unit]})`,
    neg,
    pos,
    cls: spec.palette === 'partisan' ? ['red', 'blue'] : ['purple', 'green'],
    who,
    bins,
    gradient,
    notes,
  };
}

export function renderLegend(
  metric: MetricId,
  spec: ScaleSpec,
  basis: Basis,
  labelA: string,
  labelB: string,
  cands?: { a: string; b: string; d?: string; r?: string },
): HTMLElement {
  const el = document.createElement('section');
  el.id = 'legend';
  el.setAttribute('aria-label', 'Legend');
  const info = METRICS[metric];
  const m = legendModel(metric, spec, basis, labelA, labelB, cands);
  let scaleHtml: string;
  if (m.gradient) {
    const css = m.gradient.stops.map((x) => `${x.color} ${(x.pos * 100).toFixed(1)}%`).join(', ');
    const ticks = m.gradient.ticks
      .map((t) => `<span class="tick" style="left:${(t.pos * 100).toFixed(2)}%">${t.label}</span>`)
      .join('');
    scaleHtml = `<div class="gradient" role="img" aria-label="Color scale from ${fmt0(spec)} votes in the negative direction to ${fmt0(spec)} in the positive direction, spaced logarithmically"><div class="bar" style="background:linear-gradient(to right, ${css})"></div><div class="ticks">${ticks}</div></div>
    <ul><li><span class="swatch hatch"></span><span>Missing</span></li></ul>`;
  } else {
    const rows = (m.bins ?? [])
      .map((b) => `<li><span class="swatch" style="background:${b.color}"></span><span>${b.label}</span></li>`)
      .join('');
    scaleHtml = `<ul>${rows}<li><span class="swatch hatch"></span><span>Missing</span></li></ul>`;
  }
  el.innerHTML = `
    <h2>${m.title}</h2>
    <p class="dir"><span class="${m.cls[0]}">${esc(m.neg)}</span> · <span class="${m.cls[1]}">${esc(m.pos)}</span></p>
    ${m.who ? `<p class="who">${esc(m.who)}</p>` : ''}
    ${scaleHtml}
    <details class="more"><summary>About this scale</summary><p class="note">${info.define(labelA, labelB)} ${m.notes.join(' ')}</p></details>`;
  return el;
}

function fmt0(spec: ScaleSpec): string {
  return fmtCount(spec.continuous?.max ?? 0);
}
