import { marginBins } from '../domain/scales.ts';

export function renderLegend(): HTMLElement {
  const el = document.createElement('section');
  el.id = 'legend';
  el.setAttribute('aria-label', 'Legend');
  const bins = marginBins();
  const rows = bins
    .map(
      (b) =>
        `<li><span class="swatch" style="background:${b.color}"></span><span>${b.label}</span></li>`,
    )
    .join('');
  el.innerHTML = `
    <h2>Margin swing (percentage points)</h2>
    <p class="dir"><span class="red">◀ Toward Republicans (red)</span> · <span class="blue">Toward Democrats (blue) ▶</span></p>
    <ul>${rows}<li><span class="swatch hatch"></span><span>Missing</span></li></ul>
    <p class="note">Swing = 2026 margin − 2024 margin, where margin = (D − R) ÷ total votes. Bins are fixed so maps stay comparable.</p>`;
  return el;
}
