// PNG export: build a self-contained 1600x1000 SVG (all styles inline), draw it to a 2x canvas, download.
import type { LegendModel } from './legend.ts';

export const EXPORT_W = 1600;
export const EXPORT_H = 1000;
export const EXPORT_SCALE = 2;

/** Regions of the export (in SVG units), used by the layout and by tests that sample pixels. */
export const MAP_BOX = { x: 80, y: 150, w: 737, h: 700 } as const;
export const LEGEND_BOX = { x: 880, y: 150, w: 680, h: 330 } as const;

export interface ExportInput {
  title: string;
  subtitle: string;
  /** e.g. "UNOFFICIAL as of 2026-11-04" or "CERTIFIED" */
  statusText: string;
  unofficial: boolean;
  /** inner markup of the on-page map svg (viewBox 0 0 800 760), already cleaned */
  mapMarkup: string;
  /** null when the view is not comparable */
  legend: LegendModel | null;
  blockedMessage: string | null;
  races: { a: string; b: string };
  sources: string[];
  url: string;
}

const FONT = 'system-ui, Segoe UI, Arial, sans-serif';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Greedy word wrap; words longer than the limit (like URLs) are split. */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > max) {
      if (cur) {
        lines.push(cur);
        cur = '';
      }
      lines.push(word.slice(0, max));
      word = word.slice(max);
    }
    if (cur === '') cur = word;
    else if (cur.length + 1 + word.length <= max) cur += ' ' + word;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function textLines(x: number, y: number, lines: string[], size: number, fill: string, weight = 400, lh = 1.35): string {
  return lines
    .map(
      (l, i) =>
        `<text x="${x}" y="${(y + i * size * lh).toFixed(1)}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(l)}</text>`,
    )
    .join('');
}

const COLOR: Record<string, string> = { red: '#b2182b', blue: '#2166ac', purple: '#762a83', green: '#1b7837' };

function legendSvg(m: LegendModel): { svg: string; bottom: number } {
  const x = LEGEND_BOX.x;
  let y = LEGEND_BOX.y + 20;
  let out = `<text x="${x}" y="${y}" font-size="24" font-weight="700" fill="#1a1a1a">${esc(m.title)}</text>`;
  y += 32;
  const dirLines = wrap(m.neg, 62);
  out += textLines(x, y, dirLines, 18, COLOR[m.cls[0]] ?? '#444', 600);
  y += dirLines.length * 24 + 2;
  const posLines = wrap(m.pos, 62);
  out += textLines(x, y, posLines, 18, COLOR[m.cls[1]] ?? '#444', 600);
  y += posLines.length * 24 + 6;
  if (m.who) {
    const who = wrap(m.who, 72);
    out += textLines(x, y, who, 16, '#444');
    y += who.length * 22 + 6;
  }
  y += 6;
  if (m.gradient) {
    const w = 640;
    const stops = m.gradient.stops
      .map((s) => `<stop offset="${(s.pos * 100).toFixed(1)}%" stop-color="${s.color}"/>`)
      .join('');
    out += `<defs><linearGradient id="legend-grad" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient></defs>`;
    out += `<rect x="${x}" y="${y}" width="${w}" height="30" fill="url(#legend-grad)" stroke="#999"/>`;
    for (const t of m.gradient.ticks) {
      const tx = x + t.pos * w;
      out += `<line x1="${tx.toFixed(1)}" x2="${tx.toFixed(1)}" y1="${y + 30}" y2="${y + 36}" stroke="#555"/>`;
      out += `<text x="${tx.toFixed(1)}" y="${y + 54}" font-size="15" fill="#333" text-anchor="middle">${esc(t.label)}</text>`;
    }
    y += 66;
  } else if (m.bins) {
    const colW = 220;
    m.bins.forEach((b, i) => {
      const cx = x + (i % 3) * colW;
      const cy = y + Math.floor(i / 3) * 30;
      out += `<rect x="${cx}" y="${cy}" width="28" height="20" fill="${b.color}" stroke="#999"/>`;
      out += `<text x="${cx + 36}" y="${cy + 16}" font-size="16" fill="#222">${esc(b.label)}</text>`;
    });
    y += Math.ceil(m.bins.length / 3) * 30;
  }
  out += `<rect x="${x}" y="${y}" width="28" height="20" fill="url(#hatch)" stroke="#999"/>`;
  out += `<text x="${x + 36}" y="${y + 16}" font-size="16" fill="#222">Missing</text>`;
  return { svg: out, bottom: y + 20 };
}

/** The export as a standalone SVG document. Pure: no DOM needed. */
export function buildExportSvg(i: ExportInput): string {
  const titleLines = wrap(i.title, 58);
  const badgeW = Math.min(520, 28 + i.statusText.length * 12);
  const badgeFill = i.unofficial ? '#ffb000' : '#1a7f37';
  const badgeText = i.unofficial ? '#1a1a1a' : '#ffffff';
  let body = `<rect width="${EXPORT_W}" height="${EXPORT_H}" fill="#ffffff"/>`;

  // Header: title, color note, status badge.
  body += `<g id="x-title">${textLines(40, 52, titleLines, 34, '#1a1a1a', 700, 1.2)}</g>`;
  body += `<g id="x-subtitle">${textLines(40, 52 + titleLines.length * 41 + 4, wrap(i.subtitle, 130), 18, '#444')}</g>`;
  body += `<g id="x-status"><rect x="${EXPORT_W - 40 - badgeW}" y="24" width="${badgeW}" height="40" rx="6" fill="${badgeFill}"/>`;
  body += `<text x="${EXPORT_W - 40 - badgeW / 2}" y="51" font-size="20" font-weight="700" fill="${badgeText}" text-anchor="middle">${esc(i.statusText)}</text></g>`;

  // Map (nested svg keeps the page map's coordinates and its hatch pattern).
  body += `<g id="x-map"><svg x="${MAP_BOX.x}" y="${MAP_BOX.y}" width="${MAP_BOX.w}" height="${MAP_BOX.h}" viewBox="0 0 800 760">${i.mapMarkup}</svg></g>`;

  // Legend and races.
  let racesY = LEGEND_BOX.y + 40;
  if (i.legend) {
    const l = legendSvg(i.legend);
    body += `<g id="x-legend">${l.svg}</g>`;
    racesY = l.bottom + 50;
  } else if (i.blockedMessage) {
    body += `<g id="x-legend">${textLines(LEGEND_BOX.x, LEGEND_BOX.y + 24, wrap(i.blockedMessage, 70), 18, '#b00020', 600)}</g>`;
    racesY = LEGEND_BOX.y + 140;
  }
  let races = `<text x="${LEGEND_BOX.x}" y="${racesY}" font-size="22" font-weight="700" fill="#1a1a1a">Races compared</text>`;
  races += textLines(LEGEND_BOX.x, racesY + 32, wrap(`From: ${i.races.a}`, 62), 20, '#222');
  races += textLines(LEGEND_BOX.x, racesY + 62, wrap(`To: ${i.races.b}`, 62), 20, '#222');
  body += `<g id="x-races">${races}</g>`;

  // Footer: sources, status, link.
  const src = wrap(`Sources: ${i.sources.join(' ')}`, 200);
  const urlLines = wrap(i.url, 190);
  let foot = `<line x1="40" x2="${EXPORT_W - 40}" y1="868" y2="868" stroke="#ccc"/>`;
  foot += textLines(40, 892, src, 14, '#444');
  const statusY = 892 + src.length * 19 + 4;
  foot += `<text x="40" y="${statusY}" font-size="14" font-weight="700" fill="${i.unofficial ? '#8a5a00' : '#1a7f37'}">Status: ${esc(i.statusText)}</text>`;
  foot += textLines(40, statusY + 22, urlLines, 13, '#555');
  body += `<g id="x-footer">${foot}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_W}" height="${EXPORT_H}" viewBox="0 0 ${EXPORT_W} ${EXPORT_H}" font-family="${FONT}">${body}</svg>`;
}

/** Inner markup of the on-page map svg with interactive attributes and titles removed. */
export function mapMarkup(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  for (const el of clone.querySelectorAll('title')) el.remove();
  for (const el of clone.querySelectorAll('*')) {
    for (const a of ['tabindex', 'aria-label', 'role', 'data-fill', 'data-unit', 'data-selected']) el.removeAttribute(a);
  }
  return clone.innerHTML;
}

export function exportFileName(a: string, b: string, metric: string): string {
  const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `electionshifter-${safe(a)}-vs-${safe(b)}-${safe(metric)}.png`;
}

/** Draw the SVG to a canvas at 2x and encode as PNG. */
export async function renderPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.width = EXPORT_W;
    img.height = EXPORT_H;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('The export image could not be built.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_W * EXPORT_SCALE;
    canvas.height = EXPORT_H * EXPORT_SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed.'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface ExportPanel {
  /** Provide the function that builds the current export input. */
  setSource(f: () => { input: ExportInput; fileName: string }): void;
}

export function mountExport(host: HTMLElement): ExportPanel {
  host.innerHTML = `<button type="button" id="download-png">Download PNG</button> <span id="export-status" role="status"></span>`;
  const status = host.querySelector<HTMLElement>('#export-status')!;
  let source: (() => { input: ExportInput; fileName: string }) | null = null;
  host.querySelector('#download-png')!.addEventListener('click', async () => {
    if (source === null) return;
    status.textContent = 'Building image…';
    try {
      const { input, fileName } = source();
      const blob = await renderPng(buildExportSvg(input));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      status.textContent = `Downloaded ${fileName}.`;
    } catch (e) {
      status.textContent = `Could not make the image: ${String(e)}`;
    }
  });
  return {
    setSource(f) {
      source = f;
    },
  };
}
