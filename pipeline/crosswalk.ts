import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import type { Unit } from './geo.ts';

export interface Alias {
  source_id: string;
  state_po: string;
  source_label: string;
  unit_id: string;
}

/** Lookup-only normalization: uppercase, strip accents and punctuation, collapse spaces. */
export function normLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class Crosswalk {
  private readonly names = new Map<string, string>();
  private readonly specific = new Map<string, string>();
  private readonly generic = new Map<string, string>();
  private readonly ambiguous = new Set<string>();
  private readonly fips = new Map<string, string>();
  readonly units: Unit[];
  readonly unitIds: Set<string>;

  constructor(units: Unit[], aliases: Alias[]) {
    this.units = units;
    this.unitIds = new Set(units.map((u) => u.unit_id));
    for (const u of units) {
      const k = `${u.state_po}|${normLabel(u.name)}`;
      if (this.names.has(k)) this.ambiguous.add(k);
      this.names.set(k, u.unit_id);
      this.fips.set(u.state_po, u.unit_id.slice(0, 2));
    }
    for (const a of aliases) {
      if (!this.unitIds.has(a.unit_id)) throw new Error(`Alias ${a.source_label} points at unknown unit ${a.unit_id}`);
      const k = `${a.state_po}|${normLabel(a.source_label)}`;
      if (a.source_id === '*') this.generic.set(k, a.unit_id);
      else this.specific.set(`${a.source_id}|${k}`, a.unit_id);
    }
  }

  stateFips(statePo: string): string {
    const f = this.fips.get(statePo);
    if (f === undefined) throw new Error(`Unknown state ${statePo}`);
    return f;
  }

  /** Sorted unit ids for one state. */
  stateUnits(statePo: string): string[] {
    return this.units
      .filter((u) => u.state_po === statePo)
      .map((u) => u.unit_id)
      .sort();
  }

  /** Source alias, then generic alias, then exact unit name in the state. Never fuzzy. */
  resolve(sourceId: string, statePo: string, label: string): string {
    const k = `${statePo}|${normLabel(label)}`;
    const byName = this.ambiguous.has(k) ? undefined : this.names.get(k);
    const id = this.specific.get(`${sourceId}|${k}`) ?? this.generic.get(k) ?? byName;
    if (id === undefined) {
      throw new Error(`Unmatched geography label "${label}" (${sourceId}, ${statePo}). Add a row to aliases.csv.${this.ambiguous.has(k) ? ` (the name is ambiguous in this state)` : ""}`);
    }
    return id;
  }
}

export function loadCrosswalk(root: string, unitsCsv: string): Crosswalk {
  const units = parse(unitsCsv, { columns: true, skip_empty_lines: true }) as Unit[];
  const aliases = parse(readFileSync(join(root, 'data/crosswalk/aliases.csv'), 'utf8'), {
    columns: true,
    skip_empty_lines: true,
  }) as Alias[];
  return new Crosswalk(units, aliases);
}
