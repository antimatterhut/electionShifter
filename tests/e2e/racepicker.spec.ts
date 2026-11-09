import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const data = (p: string) => JSON.parse(readFileSync(join(process.cwd(), 'public/data/v1', p), 'utf8'));
const manifest = data('manifest.json') as { races: { race_id: string; file: string; year: number }[] };

const COLLIN = '#map path[data-unit="48085"]';

async function pick(page: Page, a: [string, string], b: [string, string]) {
  await page.selectOption('#year-a', a[0]);
  await page.selectOption('#race-a', { label: a[1] });
  await page.selectOption('#year-b', b[0]);
  await page.selectOption('#race-b', { label: b[1] });
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#map path[data-unit]')).toHaveCount(254);
});

test('the picker starts on 2024 President and 2026 Senate and lists races from the manifest', async ({ page }) => {
  await expect(page.locator('#year-a')).toHaveValue('2024');
  await expect(page.locator('#race-a option:checked')).toHaveText('President');
  await expect(page.locator('#year-b')).toHaveValue('2026');
  await expect(page.locator('#race-b option:checked')).toHaveText('U.S. Senate');
  await expect(page.locator('#year-a option')).toHaveText(['2026', '2024']);
  const in2026 = manifest.races.filter((r) => r.year === 2026).length;
  await expect(page.locator('#race-b option')).toHaveCount(in2026);
  // The default pair still shows the Phase 6 numbers.
  await expect(page.locator(COLLIN)).toHaveAttribute('aria-label', /Collin County: swing \+23\.18 pts/);
});

test('Railroad Commissioner vs Senate (2026) works by margin and by raw vote', async ({ page }) => {
  await pick(page, ['2026', 'Railroad Commissioner'], ['2026', 'U.S. Senate']);
  await expect(page.locator('h1')).toContainText('2026 U.S. Senate vs. 2026 Railroad Commissioner');
  // Collin: Senate margin +12.09 pts / +55,307; Railroad Commissioner +24,091 votes.
  await page.selectOption('#metric', 'margin_swing');
  await expect(page.locator(COLLIN)).toHaveAttribute('aria-label', /Collin County: swing \+\d+\.\d\d pts/);
  await page.selectOption('#metric', 'raw_shift');
  await expect(page.locator(COLLIN)).toHaveAttribute('aria-label', /raw shift \+31,216 votes/);
  await page.selectOption('#metric', 'raw_margin');
  await page.selectOption('#which', 'A');
  await expect(page.locator(COLLIN)).toHaveAttribute('aria-label', /raw margin \+24,091 votes/);
  await page.selectOption('#which', 'B');
  await expect(page.locator(COLLIN)).toHaveAttribute('aria-label', /raw margin \+55,307 votes/);
  const fills = await page.locator('#map path[data-unit]').evaluateAll((els) => new Set(els.map((e) => e.getAttribute('data-fill'))).size);
  expect(fills).toBeGreaterThan(1);
  await expect(page.locator('#not-comparable')).toBeHidden();
});

test('Governor vs Senate (ticket splitting) shows the margin difference', async ({ page }) => {
  await pick(page, ['2026', 'Governor'], ['2026', 'U.S. Senate']);
  await expect(page.locator('h1')).toContainText('2026 U.S. Senate vs. 2026 Governor');
  await page.selectOption('#metric', 'raw_shift');
  await expect(page.locator(COLLIN)).toHaveAttribute('aria-label', /raw shift \+34,839 votes/);
});

test('French vs Paxton: candidate selectors are filled from race data and raw change renders', async ({ page }) => {
  await pick(page, ['2026', 'Railroad Commissioner'], ['2026', 'U.S. Senate']);
  await page.selectOption('#metric', 'candidate_change_raw');
  const optionFor = (sel: string, text: string) => page.locator(`${sel} option`, { hasText: text }).getAttribute('value');
  await page.selectOption('#cand-a', (await optionFor('#cand-a', 'French'))!);
  await page.selectOption('#cand-b', (await optionFor('#cand-b', 'Paxton'))!);
  await expect(page.locator(COLLIN)).toHaveAttribute('aria-label', /candidate change −10,839 votes/);
});

test('changing the year keeps the same office when it exists, else the first race of that year', async ({ page }) => {
  // 2026 has no President race, so race A falls back to the first 2026 race.
  await page.selectOption('#year-a', '2026');
  await expect(page.locator('#race-a option:checked')).toHaveText('U.S. Senate');
  await page.selectOption('#race-a', { label: 'Railroad Commissioner' });
  await page.selectOption('#year-a', '2024');
  await expect(page.locator('#race-a option:checked')).toHaveText('Railroad Commissioner');
});

test('2024 Railroad Commissioner is labeled unofficial (no independent total yet)', async ({ page }) => {
  await pick(page, ['2024', 'Railroad Commissioner'], ['2026', 'Railroad Commissioner']);
  await expect(page.locator('.badge')).toContainText('UNOFFICIAL');
  await expect(page.locator('#source')).toContainText('not marked certified');
});

test('a certified pair shows the CERTIFIED badge', async ({ page }) => {
  await pick(page, ['2024', 'President'], ['2024', 'U.S. Senate']);
  await expect(page.locator('.badge')).toHaveText('CERTIFIED');
});

test('an uncontested race shows "Not comparable" for margin metrics but not for turnout', async ({ page }) => {
  // Synthetic race: the Governor file with its Democratic candidates removed.
  const gov = manifest.races.find((r) => r.race_id === '2026-TX-governor-gen')!;
  const fake = {
    ...gov,
    race_id: '2026-TX-uncontested-gen',
    office: 'uncontested',
    office_label: 'Uncontested Test Race',
    file: 'races/2026/TX/2026-TX-uncontested-gen.json',
  };
  await page.route('**/data/v1/manifest.json', async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.races.push({ ...fake, has_dem: false });
    await route.fulfill({ response: res, json: body });
  });
  await page.route('**/data/v1/races/2026/TX/2026-TX-uncontested-gen.json', async (route) => {
    const race = data(gov.file);
    const keep = race.candidates.map((c: { group: string }) => c.group !== 'D');
    await route.fulfill({
      json: {
        ...race,
        race_id: fake.race_id,
        candidates: race.candidates.filter((_: unknown, i: number) => keep[i]),
        votes: race.votes.filter((_: unknown, i: number) => keep[i]),
      },
    });
  });
  await page.goto('./');
  await expect(page.locator('#map path[data-unit]')).toHaveCount(254);
  await page.selectOption('#race-b', { label: 'Uncontested Test Race' });
  await expect(page.locator('h1')).toContainText('Uncontested Test Race');
  await page.selectOption('#metric', 'margin_swing');
  await expect(page.locator('#not-comparable')).toContainText('Not comparable: no D–R contest');
  await expect(page.locator(COLLIN)).toHaveAttribute('data-fill', 'missing');
  await page.selectOption('#metric', 'raw_shift');
  await expect(page.locator('#not-comparable')).toContainText('Not comparable');
  // Candidate and turnout views still work.
  await page.selectOption('#metric', 'turnout_change_pct');
  await expect(page.locator('#not-comparable')).toBeHidden();
  await expect(page.locator(COLLIN)).not.toHaveAttribute('data-fill', 'missing');
});
