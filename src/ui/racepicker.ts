import { raceAfterYearChange, racesInYear, yearsOf } from '../domain/races.ts';
import type { RaceMeta } from '../domain/types.ts';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export interface RacePair {
  a: string;
  b: string;
}

type Side = 'a' | 'b';

/**
 * Two-step picker for both races: choose a year, then a race held that year. Options come from
 * the manifest only. Calls `onChange` with the new pair of race ids.
 */
export function renderRacePicker(
  el: HTMLElement,
  races: readonly RaceMeta[],
  pair: RacePair,
  onChange: (next: RacePair) => void,
): void {
  const byId = new Map(races.map((r) => [r.race_id, r]));
  const years = yearsOf(races);
  let current = { ...pair };

  const block = (side: Side, title: string): string => {
    const m = byId.get(current[side])!;
    return `
      <fieldset class="pick" id="pick-${side}">
        <legend>${esc(title)}</legend>
        <label for="year-${side}">Year</label>
        <select id="year-${side}">${years
          .map((y) => `<option value="${y}"${y === m.year ? ' selected' : ''}>${y}</option>`)
          .join('')}</select>
        <label for="race-${side}">Race</label>
        <select id="race-${side}">${racesInYear(races, m.year)
          .map(
            (r) =>
              `<option value="${esc(r.race_id)}"${r.race_id === m.race_id ? ' selected' : ''}>${esc(r.office_label)}</option>`,
          )
          .join('')}</select>
      </fieldset>`;
  };

  const draw = () => {
    el.innerHTML = `${block('a', 'From (race A)')}${block('b', 'To (race B)')}`;
    for (const side of ['a', 'b'] as const) {
      const yearSel = el.querySelector<HTMLSelectElement>(`#year-${side}`)!;
      const raceSel = el.querySelector<HTMLSelectElement>(`#race-${side}`)!;
      yearSel.addEventListener('change', () => {
        const next = raceAfterYearChange(races, byId.get(current[side])!, Number(yearSel.value));
        if (next === null) return;
        current = { ...current, [side]: next.race_id };
        draw();
        onChange(current);
        el.querySelector<HTMLSelectElement>(`#year-${side}`)!.focus();
      });
      raceSel.addEventListener('change', () => {
        current = { ...current, [side]: raceSel.value };
        onChange(current);
      });
    }
  };
  draw();
}
