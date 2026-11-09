import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const data = (p: string) => JSON.parse(readFileSync(join(process.cwd(), 'public/data/v1', p), 'utf8'));
const COLLIN = '#map path[data-unit="48085"]';
const DENTON = '#map path[data-unit="48121"]';

interface Race {
  units: string[];
  candidates: { group: string; aligned: string | null }[];
  votes: (number | null)[][];
  other_votes: (number | null)[];
  total_votes: (number | null)[];
}

type Row = { d: number; r: number; t: number } | null;

/** Replace two counties' votes in a default-pair race file (MASTER_PLAN §4 worked example). */
async function mockRace(page: Page, file: string, rows: Record<string, Row>) {
  await page.route(`**/data/v1/${file}`, async (route) => {
    const race = JSON.parse(JSON.stringify(data(file))) as Race;
    for (const [unit, row] of Object.entries(rows)) {
      const i = race.units.indexOf(unit);
      race.candidates.forEach((c, k) => {
        const side = c.aligned ?? c.group;
        race.votes[k]![i] = row === null ? null : side === 'D' ? row.d : side === 'R' ? row.r : 0;
      });
      race.total_votes[i] = row === null ? null : row.t;
      race.other_votes[i] = row === null ? null : row.t - row.d - row.r;
    }
    await route.fulfill({ json: race });
  });
}

const FILE_A = 'races/2024/TX/2024-TX-president-gen.json';
const FILE_B = 'races/2026/TX/2026-TX-us-senate-gen.json';

async function open(page: Page) {
  await page.goto('./');
  await expect(page.locator('#map path[data-unit]')).toHaveCount(254);
}

test('Collin + Denton group shows +22.43, +205,151 and −11.69%', async ({ page }) => {
  await mockRace(page, FILE_A, {
    '48085': { d: 222115, r: 279534, t: 517690 },
    '48121': { d: 191503, r: 250521, t: 449188 },
  });
  await mockRace(page, FILE_B, {
    '48085': { d: 252403, r: 197096, t: 457641 },
    '48121': { d: 211266, r: 177859, t: 396235 },
  });
  await open(page);
  await page.locator(COLLIN).click({ force: true });
  await page.locator(DENTON).click({ force: true });
  await expect(page.locator('#group-list li')).toHaveCount(2);
  await expect(page.locator('#group-value')).toHaveText('+22.43 pts');
  await expect(page.locator('#group-swing')).toHaveText('+22.43 pts');
  await expect(page.locator('#group-raw')).toHaveText('+205,151');
  await expect(page.locator('#group-turnout')).toHaveText('−11.69%');
  await expect(page.locator('#group-missing')).toHaveCount(0);
  await expect(page.locator(COLLIN)).toHaveAttribute('data-selected', '');

  // The panel follows the metric.
  await page.selectOption('#metric', 'raw_shift');
  await expect(page.locator('#group-value')).toHaveText('+205,151 votes');
});

test('remove, clear, name and keyboard selection', async ({ page }) => {
  await open(page);
  await expect(page.locator('#group')).toContainText('Click counties');
  await page.locator(COLLIN).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#group-list li')).toHaveCount(1);
  await page.locator(DENTON).click({ force: true });
  await page.fill('#group-name', 'North Dallas suburbs');
  await expect(page.locator('#group h2')).toHaveText('North Dallas suburbs');
  await page.getByRole('button', { name: /Remove Collin/i }).click();
  await expect(page.locator('#group-list li')).toHaveCount(1);
  await expect(page.locator(COLLIN)).not.toHaveAttribute('data-selected', '');
  await page.locator(DENTON).click({ force: true }); // click again deselects
  await expect(page.locator('#group-list')).toHaveCount(0);
});

test('a county missing in one race is disclosed and left out of the sums', async ({ page }) => {
  await mockRace(page, FILE_A, {
    '48085': { d: 222115, r: 279534, t: 517690 },
    '48121': { d: 191503, r: 250521, t: 449188 },
  });
  await mockRace(page, FILE_B, {
    '48085': { d: 252403, r: 197096, t: 457641 },
    '48121': null,
  });
  await open(page);
  await page.locator(COLLIN).click({ force: true });
  await page.locator(DENTON).click({ force: true });
  await expect(page.locator('#group-missing')).toContainText('1 of 2 counties have data in both races');
  await expect(page.locator('#group-missing')).toContainText('Denton');
  // Collin alone: 12.09 pts margin_B − margin_A, raw shift = (55,307) − (−57,419).
  await expect(page.locator('#group-raw')).toHaveText('+112,726');
});
