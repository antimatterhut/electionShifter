export interface TableRow {
  id: string;
  name: string;
  /** Formatted value, or a short reason when missing. */
  text: string;
  value: number | null;
}

type SortKey = 'name' | 'value';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Sortable data table of what the map shows. Returns an updater taking new rows. */
export function renderTable(el: HTMLElement): (rows: TableRow[], valueHeader: string) => void {
  let rows: TableRow[] = [];
  let header = 'Value';
  let key: SortKey = 'name';
  let dir: 1 | -1 = 1;

  const draw = () => {
    const sorted = [...rows].sort((x, y) => {
      if (key === 'name') return dir * x.name.localeCompare(y.name);
      // Missing values always sort last.
      if (x.value === null) return y.value === null ? 0 : 1;
      if (y.value === null) return -1;
      return dir * (x.value - y.value) || x.name.localeCompare(y.name);
    });
    const aria = (k: SortKey) => (key === k ? (dir === 1 ? 'ascending' : 'descending') : 'none');
    el.innerHTML = `
      <table>
        <caption>Values shown on the map</caption>
        <thead><tr>
          <th scope="col" aria-sort="${aria('name')}"><button type="button" data-sort="name">County</button></th>
          <th scope="col" aria-sort="${aria('value')}"><button type="button" data-sort="value">${esc(header)}</button></th>
        </tr></thead>
        <tbody>${sorted.map((r) => `<tr data-unit="${r.id}"><th scope="row">${esc(r.name)}</th><td>${esc(r.text)}</td></tr>`).join('')}</tbody>
      </table>`;
  };

  el.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-sort]');
    if (!b) return;
    const k = b.dataset.sort as SortKey;
    if (k === key) dir = dir === 1 ? -1 : 1;
    else {
      key = k;
      dir = k === 'value' ? -1 : 1;
    }
    draw();
    el.querySelector<HTMLButtonElement>(`button[data-sort="${k}"]`)?.focus();
  });

  return (r, h) => {
    rows = r;
    header = h;
    draw();
  };
}
