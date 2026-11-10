import { describe, expect, it } from 'vitest';
import { EXPORT_H, EXPORT_W, buildExportSvg, exportFileName, wrap, type ExportInput } from '../../src/ui/export.ts';
import { legendModel } from '../../src/ui/legend.ts';
import { scaleFor } from '../../src/domain/view.ts';

function input(over: Partial<ExportInput> = {}): ExportInput {
  return {
    title: 'How Texas shifted: 2026 US Senate vs. 2024 President',
    subtitle: 'Red = more Republican, blue = more Democratic',
    statusText: 'UNOFFICIAL as of 2026-11-04',
    unofficial: true,
    mapMarkup: '<path d="M0 0L10 10" fill="#2166ac" data-x="1"/>',
    legend: legendModel('margin_swing', scaleFor('margin_swing', []), 'two_party', '2024 President', '2026 US Senate'),
    blockedMessage: null,
    races: { a: '2024 President', b: '2026 US Senate' },
    sources: ['2024 President: Source One (certified, as of 2025-01-01).', '2026 US Senate: Source Two (unofficial, as of 2026-11-04).'],
    url: 'https://antimatterhut.github.io/electionShifter/?v=1&a=x&b=y',
    ...over,
  };
}

describe('export svg', () => {
  it('is 1600x1000 and contains title, map, legend, both races, sources, status and link', () => {
    const svg = buildExportSvg(input());
    expect(svg).toContain(`width="${EXPORT_W}" height="${EXPORT_H}"`);
    expect(EXPORT_W).toBe(1600);
    expect(EXPORT_H).toBe(1000);
    expect(svg).toContain('How Texas shifted');
    expect(svg).toContain('id="x-map"');
    expect(svg).toContain('fill="#2166ac"');
    expect(svg).toContain('id="x-legend"');
    expect(svg).toContain('Races compared');
    expect(svg).toContain('From: 2024 President');
    expect(svg).toContain('To: 2026 US Senate');
    expect(svg).toContain('Source One');
    expect(svg).toContain('Source Two');
    expect(svg).toContain('UNOFFICIAL as of 2026-11-04');
    expect(svg).toContain('Status: UNOFFICIAL as of 2026-11-04');
    expect(svg).toContain('antimatterhut.github.io/electionShifter/?v=1');
  });
  it('uses no external styles or references', () => {
    const svg = buildExportSvg(input());
    expect(svg).not.toMatch(/<style|class=|href=|<image|foreignObject/);
  });
  it('shows a certified badge in green', () => {
    const svg = buildExportSvg(input({ statusText: 'CERTIFIED', unofficial: false }));
    expect(svg).toContain('>CERTIFIED<');
    expect(svg).toContain('#1a7f37');
    expect(svg).not.toContain('UNOFFICIAL');
  });
  it('escapes markup in text', () => {
    const svg = buildExportSvg(input({ title: 'A & B <x>' }));
    expect(svg).toContain('A &amp; B &lt;x&gt;');
  });
  it('gives the legend swatches for every bin', () => {
    const m = legendModel('margin_swing', scaleFor('margin_swing', []), 'two_party', 'A', 'B');
    const svg = buildExportSvg(input({ legend: m }));
    for (const b of m.bins!) expect(svg).toContain(`fill="${b.color}"`);
    expect(svg).toContain('Missing');
  });
  it('draws a gradient for raw-vote scales', () => {
    const m = legendModel('raw_shift', scaleFor('raw_shift', [50000, -20]), 'two_party', 'A', 'B');
    expect(m.gradient).not.toBeNull();
    expect(buildExportSvg(input({ legend: m }))).toContain('linearGradient');
  });
  it('shows the blocked message when the view is not comparable', () => {
    const svg = buildExportSvg(input({ legend: null, blockedMessage: 'These races cannot be compared.' }));
    expect(svg).toContain('These races cannot be compared.');
    expect(svg).toContain('UNOFFICIAL');
  });
});

describe('helpers', () => {
  it('wraps text and splits very long words', () => {
    expect(wrap('aa bb cc', 5)).toEqual(['aa bb', 'cc']);
    expect(wrap('x'.repeat(25), 10)).toEqual(['x'.repeat(10), 'x'.repeat(10), 'x'.repeat(5)]);
  });
  it('builds the file name from races and metric', () => {
    expect(exportFileName('2024-TX-president-gen', '2026-TX-us-senate-gen', 'raw_shift')).toBe(
      'electionshifter-2024-tx-president-gen-vs-2026-tx-us-senate-gen-raw-shift.png',
    );
  });
});
