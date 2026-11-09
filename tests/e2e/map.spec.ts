import { expect, test } from '@playwright/test';
import { BLUE_RAMP } from '../../src/domain/scales.ts';

test('Texas 2026 Senate vs 2024 President swing map', async ({ page }) => {
  const errors: string[] = [];
  const bad: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => bad.push(`failed ${r.url()}`));

  await page.goto('./');
  await expect(page.locator('#map path[data-unit]')).toHaveCount(254);

  await expect(page.locator('#legend')).toBeVisible();
  await expect(page.getByText('UNOFFICIAL', { exact: false }).first()).toBeVisible();
  await expect(page.locator('h1')).toContainText('Texas');
  await expect(page.locator('#source')).toContainText('Sources');
  await expect(page.locator('#source')).toContainText('2024');
  await expect(page.locator('#source')).toContainText('2026');

  // No county is hatched/missing in this slice.
  await expect(page.locator('#map path[data-fill="missing"]')).toHaveCount(0);

  // Collin (FIPS 48085): swing +23.18, in the +15 to +25 bin.
  const collin = page.locator('#map path[data-unit="48085"]');
  await expect(collin).toHaveAttribute('data-fill', BLUE_RAMP[4]);
  await expect(collin).toHaveAttribute('aria-label', /Collin County: swing \+23\.18 pts/);

  await page.screenshot({ path: 'test-results/phase5-map.png', fullPage: true });

  expect(errors).toEqual([]);
  expect(bad).toEqual([]);
});
