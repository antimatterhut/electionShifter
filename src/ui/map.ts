import { geoConicEqualArea, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

const W = 800;
const H = 760;
const NS = 'http://www.w3.org/2000/svg';

export interface UnitPaint {
  fill: string | null; // null = missing (hatched)
  label: string; // accessible name and basic title
}

/**
 * Draws one SVG path per unit, projected with a conic equal-area projection
 * fit to the state. Returns the svg element.
 */
export function renderMap(topo: any, paint: (unitId: string, name: string) => UnitPaint): SVGSVGElement {
  const fc = feature(topo, topo.objects.counties) as unknown as GeoJSON.FeatureCollection;
  const projection = geoConicEqualArea()
    .rotate([100, 0])
    .parallels([27.5, 35])
    .fitExtent(
    [
      [10, 10],
      [W - 10, H - 10],
    ],
    fc,
  );
  const path = geoPath(projection);

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'County map');
  svg.id = 'map';

  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="#888" stroke-width="2"/></pattern>`;
  svg.appendChild(defs);

  const g = document.createElementNS(NS, 'g');
  for (const f of fc.features) {
    const id = String((f as any).id ?? f.properties?.GEOID);
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', path(f) ?? '');
    p.setAttribute('data-unit', id);
    p.setAttribute('tabindex', '0');
    p.setAttribute('stroke', '#fff');
    p.setAttribute('stroke-width', '0.5');
    p.appendChild(document.createElementNS(NS, 'title'));
    g.appendChild(p);
  }
  svg.appendChild(g);
  paintMap(svg, paint);
  return svg;
}

/** Re-applies fill and labels to every unit path (used when the metric changes). */
export function paintMap(svg: SVGSVGElement, paint: (unitId: string, name: string) => UnitPaint): void {
  for (const p of svg.querySelectorAll<SVGPathElement>('path[data-unit]')) {
    const id = p.dataset.unit!;
    const u = paint(id, id);
    p.setAttribute('fill', u.fill ?? 'url(#hatch)');
    p.setAttribute('data-fill', u.fill ?? 'missing');
    p.setAttribute('aria-label', u.label);
    p.querySelector('title')!.textContent = u.label;
  }
}
