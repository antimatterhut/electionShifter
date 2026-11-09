import { fmtCount, fmtPct, fmtPts, fmtVotes, titleCase } from '../domain/format.ts';
import type { MetricResult, Totals } from '../domain/types.ts';
import type { UnitDetail } from '../domain/view.ts';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

const NA = '<span class="na">n/a</span>';

function val(r: MetricResult, f: (n: number) => string): string {
  return r.value === null ? NA : f(r.value);
}

function votes(t: Totals | null, pick: (t: Totals) => number): string {
  return t === null ? NA : fmtCount(pick(t));
}

export interface TooltipLabels {
  a: string;
  b: string;
  nameA: (id: string | null) => string;
  nameB: (id: string | null) => string;
}

export function tooltipHtml(unitName: string, d: UnitDetail, labels: TooltipLabels): string {
  const missing = d.missingIn
    .map((w) => `<p class="missing">Missing in ${esc(w === 'A' ? labels.a : labels.b)}</p>`)
    .join('');
  const c = d.candidate;
  const candLine =
    c.idA === null || c.idB === null
      ? ''
      : `<p><strong>${esc(labels.nameA(c.idA))} → ${esc(labels.nameB(c.idB))}:</strong> ${val(c.raw, fmtVotes)} votes (${val(c.pct, fmtPct)})</p>`;
  return `
    <h3>${esc(unitName)} County</h3>
    <table class="tt-votes">
      <thead><tr><th scope="col">Race</th><th scope="col">D</th><th scope="col">R</th><th scope="col">Total</th><th scope="col">Margin</th></tr></thead>
      <tbody>
        <tr><th scope="row">${esc(labels.a)}</th><td>${votes(d.a, (t) => t.d)}</td><td>${votes(d.a, (t) => t.r)}</td><td>${votes(d.a, (t) => t.t)}</td><td>${val(d.marginA, fmtPts)}</td></tr>
        <tr><th scope="row">${esc(labels.b)}</th><td>${votes(d.b, (t) => t.d)}</td><td>${votes(d.b, (t) => t.r)}</td><td>${votes(d.b, (t) => t.t)}</td><td>${val(d.marginB, fmtPts)}</td></tr>
      </tbody>
    </table>
    <p><strong>Margin swing:</strong> ${val(d.swing, fmtPts)}</p>
    <p><strong>Raw margin shift:</strong> ${val(d.rawShift, fmtVotes)}
      <span class="sub">(from margin change ${val(d.shiftFromMargin, fmtVotes)}; from turnout change ${val(d.shiftFromTurnout, fmtVotes)})</span></p>
    ${candLine}
    <p><strong>Turnout change:</strong> ${val(d.turnoutRaw, fmtVotes)} (${val(d.turnoutPct, fmtPct)})</p>
    ${missing}`;
}

/** Display name for a candidate id in a race. */
export function nameLookup(cands: { candidate_id: string; name: string }[]) {
  return (id: string | null): string => {
    const c = cands.find((x) => x.candidate_id === id);
    return c ? titleCase(c.name) : '';
  };
}

/**
 * Shows the tooltip for a map unit on hover, keyboard focus and tap/click.
 * Escape hides it. Uses event delegation on `svg`.
 */
export function attachTooltip(
  svg: SVGSVGElement,
  tip: HTMLElement,
  html: (unitId: string) => string | null,
): void {
  let pinned = false;
  const hide = () => {
    tip.hidden = true;
    pinned = false;
  };
  const unitOf = (t: EventTarget | null): SVGPathElement | null =>
    (t as Element | null)?.closest?.('path[data-unit]') as SVGPathElement | null;
  const show = (p: SVGPathElement, x?: number, y?: number) => {
    const h = html(p.dataset.unit!);
    if (h === null) return hide();
    tip.innerHTML = h;
    tip.hidden = false;
    const host = tip.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const r = p.getBoundingClientRect();
    const px = x ?? r.left + r.width / 2;
    const py = y ?? r.top + r.height / 2;
    const w = tip.offsetWidth;
    const left = Math.max(4, Math.min(px - host.left + 12, window.innerWidth - host.left - w - 4));
    tip.style.left = `${left}px`;
    tip.style.top = `${py - host.top + 12}px`;
  };
  svg.addEventListener('mousemove', (e) => {
    if (pinned) return;
    const p = unitOf(e.target);
    if (p) show(p, e.clientX, e.clientY);
    else hide();
  });
  svg.addEventListener('mouseleave', () => {
    if (!pinned && !svg.contains(document.activeElement)) hide();
  });
  svg.addEventListener('focusin', (e) => {
    const p = unitOf(e.target);
    if (p) show(p);
  });
  svg.addEventListener('focusout', hide);
  svg.addEventListener('click', (e) => {
    const p = unitOf(e.target);
    if (!p) return hide();
    show(p, e.clientX, e.clientY);
    pinned = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });
}
