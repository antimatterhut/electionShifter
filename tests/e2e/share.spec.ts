import { expect, test } from '@playwright/test';

const A = '2024-TX-president-gen';
const B = '2026-TX-us-senate-gen';
const Q = `?v=1&a=${A}&b=${B}&metric=raw_shift&basis=two_party&which=A&state=TX&g=48085,48121&gname=North`;

test('a full URL under the base path restores the view and group', async ({ page, browser }) => {
  await page.goto(Q);
  await expect(page.locator('#metric')).toHaveValue('raw_shift');
  await expect(page.locator('input[name="basis"][value="two_party"]')).toBeChecked();
  await expect(page.locator('#race-a')).toHaveValue(A);
  await expect(page.locator('#race-b')).toHaveValue(B);
  await expect(page.locator('#group-list li')).toHaveCount(2);
  await expect(page.locator('#group h2')).toHaveText('North');
  await expect(page.locator('#map path[data-selected]')).toHaveCount(2);
  const title = await page.locator('#title').textContent();
  const value = await page.locator('#group-value').textContent();

  // The copy box holds a live-site link; open its query in a brand-new context.
  const link = await page.locator('#share-link').inputValue();
  expect(link.startsWith('https://antimatterhut.github.io/electionShifter/?')).toBe(true);
  const ctx = await browser.newContext({ baseURL: new URL('./', page.url()).href });
  const p2 = await ctx.newPage();
  await p2.goto(link.slice(link.indexOf('?')));
  await expect(p2.locator('#title')).toHaveText(title!);
  await expect(p2.locator('#group-value')).toHaveText(value!);
  await expect(p2.locator('#group-list li')).toHaveCount(2);
  await expect(p2.locator('#group h2')).toHaveText('North');
  await ctx.close();
});

test('interaction updates the address bar with replaceState', async ({ page }) => {
  await page.goto('./');
  const before = await page.evaluate(() => history.length);
  await page.selectOption('#metric', 'turnout_change_pct');
  await page.locator('#map path[data-unit="48085"]').click();
  await expect.poll(() => page.url()).toContain('metric=turnout_change_pct');
  await expect.poll(() => page.url()).toContain('g=48085');
  expect(await page.evaluate(() => history.length)).toBe(before);
});

test('invalid params do not crash and show a notice', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('?v=1&a=nope&metric=bogus&basis=zz&g=1,2,3&state=ZZ&ca=ghost');
  await expect(page.locator('#url-notice')).toBeVisible();
  await expect(page.locator('#metric')).toHaveValue('margin_swing');
  await expect(page.locator('#map path[data-unit]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('legend names who is green and purple, and totals compare two candidates', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#tot-a')).toBeVisible();
  const pick = async (sel: string, re: RegExp) => {
    const v = await page.locator(`${sel} option`).evaluateAll((os, src) => {
      const r = new RegExp(src, 'i');
      return (os as HTMLOptionElement[]).find((o) => r.test(o.textContent ?? ''))?.value ?? null;
    }, re.source);
    expect(v).not.toBeNull();
    return v!;
  };
  await page.selectOption('#tot-a', await pick('#tot-a', /trump/));
  await page.selectOption('#tot-b', await pick('#tot-b', /tal[ae]rico/));
  await page.selectOption('#metric', 'candidate_change_pct');
  await expect(page.locator('#legend .who')).toContainText(/Green counties: .*Tal.*did better than .*Trump/);
  await expect(page.locator('#legend .who')).toContainText(/Purple counties/);
  await expect(page.locator('#totals-verdict')).toContainText(/would win Texas by [\d,]+ votes/);
  await expect(page.locator('#totals .totals-table')).toHaveCount(2);
  await expect(page.locator('#cand-a')).toHaveValue(await page.locator('#tot-a').inputValue());
});

test('hypothetical head-to-head: legend sits on the map and numbers match the data', async ({ page }) => {
  const { readFileSync } = await import('node:fs');
  const load = (f: string) => JSON.parse(readFileSync(`public/data/v1/races/${f}.json`, 'utf8'));
  const ra = load('2024/TX/2024-TX-president-gen');
  const rb = load('2026/TX/2026-TX-us-senate-gen');
  const votesOf = (r: any, re: RegExp) => {
    const k = r.candidates.findIndex((c: any) => re.test(c.name));
    return { k, id: r.candidates[k].candidate_id as string };
  };
  const ta = votesOf(ra, /trump/i);
  const tb = votesOf(rb, /talarico/i);
  let trump = 0;
  let tal = 0;
  ra.units.forEach((u: string, i: number) => {
    const j = rb.units.indexOf(u);
    const x = ra.votes[ta.k][i];
    const y = j < 0 ? null : rb.votes[tb.k][j];
    if (x !== null && y !== null && ra.total_votes[i] !== null && rb.total_votes[j] !== null) {
      trump += x;
      tal += y;
    }
  });

  await page.goto(`./?v=1&a=2024-TX-president-gen&b=2026-TX-us-senate-gen&metric=head_to_head&ca=${ta.id}&cb=${tb.id}`);
  const map = await page.locator('#map').boundingBox();
  const legend = await page.locator('#map-wrap #legend').boundingBox();
  expect(legend).not.toBeNull();
  expect(legend!.y + legend!.height).toBeLessThanOrEqual(map!.y + map!.height + 1);
  expect(legend!.x).toBeGreaterThanOrEqual(map!.x - 1);
  await expect(page.locator('#legend .who')).toContainText(/Red counties: .*Trump.*Blue counties: .*Talarico/);
  const fmt = (n: number) => n.toLocaleString('en-US');
  const side = page.locator('#matchup-state');
  await expect(side).toContainText(fmt(trump));
  await expect(side).toContainText(fmt(tal));
  await expect(side).toContainText(((trump / (trump + tal)) * 100).toFixed(1) + '%');
  await expect(page.locator('#matchup')).toContainText(trump > tal ? /Trump wins Texas by/ : /Talarico wins Texas by/);

  // County: exact votes beside the map and in a hover text about only these two candidates.
  const cu = '48085';
  const i = ra.units.indexOf(cu);
  const j = rb.units.indexOf(cu);
  const ct = ra.votes[ta.k][i];
  const cl = rb.votes[tb.k][j];
  await page.locator(`#map path[data-unit="${cu}"]`).hover();
  await expect(page.locator('#matchup-county')).toContainText('Collin County');
  await expect(page.locator('#matchup-county')).toContainText(`${fmt(ct)} votes`);
  await expect(page.locator('#matchup-county')).toContainText(`${fmt(cl)} votes`);
  const tip = page.locator('#tooltip');
  await expect(tip).toContainText(fmt(ct));
  await expect(tip).toContainText(fmt(cl));
  await expect(tip).not.toContainText(/Margin swing|Turnout change|Raw margin/);
});
