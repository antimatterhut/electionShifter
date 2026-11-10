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
