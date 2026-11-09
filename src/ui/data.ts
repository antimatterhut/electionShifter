import type { RaceFile, RaceMeta } from '../domain/types.ts';

export interface Manifest {
  schema_version: number;
  races: RaceMeta[];
}

export interface UnitRow {
  unit_id: string;
  state_po: string;
  name: string;
  kind: string;
}

/** Data URL under the deploy base path. Never root-relative. */
export function dataUrl(path: string): string {
  return `${import.meta.env.BASE_URL}data/v1/${path}`;
}

async function getJson<T>(path: string): Promise<T> {
  const url = dataUrl(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return (await res.json()) as T;
}

export const loadManifest = () => getJson<Manifest>('manifest.json');
export const loadUnits = () => getJson<UnitRow[]>('units.json');
export const loadRace = (meta: RaceMeta) => getJson<RaceFile>(meta.file);
export const loadTopology = (state: string) => getJson<any>(`geo/states/${state}.topo.json`);
