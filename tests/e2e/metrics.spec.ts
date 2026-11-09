import { expect, test } from '@playwright/test';

const METRICS: { value: string; legend: RegExp; collin: RegExp }[] = [
  { value: 'margin_swing', legend: /Margin swing/, collin: /Collin County: swing \+23\.18 pts/ },
  { value: 'raw_shift', legend: /Raw margin shift/, collin: /Collin County: raw shift \+112,726 votes/ },
  { value: 'shift_from_margin', legend: /Shift from margin change/, collin: /\+119,983 votes/ },
  { value: 'shift_from_turnout', legend: /Shift from turnout change/, collin: /−7,257 votes/ },
  { value: 'margin', legend: /Margin \(one race\)/, collin: /Collin County: margin \+12\.09 pts/ },
  { value: 'raw_margin', legend: /Raw margin \(one race\)/, collin: /Collin County: raw margin \+55,307 votes/ },
  { value: 'candidate_change_pct', legend: /Candidate change, %/, collin: /candidate change \+13\.64%/ },
  { value: 'candidate_change_raw', legend: /Candidate change, votes/, collin: /candidate change \+30,288 votes/ },
  { value: 'turnout_change_pct', legend: /Turnout change, %/, collin: /turnout change −11\.60%/ },
  { value: 'turnout_change_raw', legend: /Turnout change, votes/, collin: /turnout change −60,049 votes/ },
];

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#map path[data-unit]')).toHaveCount(254);
});

for (const m of METRICS) {
  test(`metric ${m.value} is selectable and paints the map`, async ({ page }) => {
    await page.selectOption('#metric', m.value);
    await expect(page.locator('#legend h2')).toContainText(m.legend);
    await expect(page.locator('#map path[data-unit="48085"]')).toHaveAttribute('aria-label', m.collin);
    await expect(page.locator('#definition')).not.toBeEmpty();
    const fills = await page.locator('#map path[data-unit]').evaluateAll((els) =>
      new Set(els.map((e) => e.getAttribute('data-fill'))).size,
    );
    expect(fills).toBeGreaterThan(1);
  });
}

test('candidate and turnout metrics use purple/green, margin metrics red/blue', async ({ page }) => {
  await page.selectOption('#metric', 'turnout_change_pct');
  await expect(page.locator('#legend .purple')).toBeVisible();
  await expect(page.locator('#legend .green')).toBeVisible();
  await expect(page.locator('#legend .red')).toHaveCount(0);
  await page.selectOption('#metric', 'margin_swing');
  await expect(page.locator('#legend .red')).toBeVisible();
});

test('two-party basis changes Collin to +23.75', async ({ page }) => {
  await page.getByLabel('Two-party (D + R)').check();
  await expect(page.locator('#map path[data-unit="48085"]')).toHaveAttribute('aria-label', /swing \+23\.75 pts/);
});

test('candidate selectors are filled from race data', async ({ page }) => {
  await page.selectOption('#metric', 'candidate_change_raw');
  expect(await page.locator('#cand-a option').count()).toBeGreaterThanOrEqual(2);
  expect(await page.locator('#cand-b option').count()).toBeGreaterThanOrEqual(2);
  // Switching B's candidate changes the value (Republican vs Republican-side pick).
  const before = await page.locator('#map path[data-unit="48085"]').getAttribute('aria-label');
  await page.locator('#cand-b').selectOption({ index: 1 });
  await expect(page.locator('#map path[data-unit="48085"]')).not.toHaveAttribute('aria-label', before!);
});

test('turnout notice appears for this pair and links to the Turnout view', async ({ page }) => {
  const notice = page.locator('#notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('Fewer people voted in 2026');
  await notice.getByRole('button', { name: /Turnout view/ }).click();
  await expect(page.locator('#metric')).toHaveValue('turnout_change_pct');
});

test('Collin tooltip shows the decomposition numbers on hover', async ({ page }) => {
  await page.locator('#map path[data-unit="48085"]').hover({ force: true });
  await page.screenshot({ path: 'test-results/phase6-tooltip.png', fullPage: true });
  const tip = page.locator('#tooltip');
  await expect(tip).toBeVisible();
  for (const s of ['Collin County', '+23.18', '+112,726', '+30,288', '+13.64%', '−11.60%', '+119,983', '−7,257']) {
    await expect(tip).toContainText(s);
  }
});

test('keyboard focus shows the tooltip and Escape hides it', async ({ page }) => {
  await page.locator('#map path[data-unit="48085"]').focus();
  const tip = page.locator('#tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('+23.18');
  await expect(tip).toContainText('−11.60%');
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  // Tab moves to another county and shows its tooltip.
  await page.locator('#map path[data-unit]').first().focus();
  await page.keyboard.press('Tab');
  await expect(tip).toBeVisible();
});

test('tapping a county shows its tooltip', async ({ page }) => {
  await page.locator('#map path[data-unit="48085"]').click({ force: true });
  await expect(page.locator('#tooltip')).toContainText('Collin County');
});

test('data table is sortable', async ({ page }) => {
  await page.locator('#table-wrap summary').click();
  await expect(page.locator('#table tbody tr')).toHaveCount(254);
  await page.getByRole('button', { name: 'Margin swing' }).click(); // descending by value
  const first = await page.locator('#table tbody tr').first().locator('td').innerText();
  const last = await page.locator('#table tbody tr').last().locator('td').innerText();
  const num = (s: string) => Number(s.replace('−', '-').replace(/[^\d.-]/g, ''));
  expect(num(first)).toBeGreaterThan(num(last));
  await page.getByRole('button', { name: 'County' }).click();
  await expect(page.locator('#table th[aria-sort="ascending"]')).toHaveCount(1);
});
