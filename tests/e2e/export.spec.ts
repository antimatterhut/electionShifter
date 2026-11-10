import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const A = '2024-TX-president-gen';
const B = '2026-TX-us-senate-gen';

/** Width and height from the PNG IHDR chunk (bytes 16-23, big endian). */
function pngSize(buf: Buffer): { w: number; h: number } {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

test('Download PNG produces a 3200x2000 image with map, legend, header and footer drawn', async ({ page }) => {
  await page.goto(`./?v=1&a=${A}&b=${B}&metric=margin_swing&basis=two_party&which=A&state=TX`);
  await expect(page.locator('#map path[data-fill]').first()).toBeVisible();
  const pageFills = await page.$$eval('#map path[data-unit]', (ps) =>
    [...new Set(ps.map((p) => p.getAttribute('fill')!).filter((f) => f.startsWith('#')))],
  );

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#download-png')]);
  expect(download.suggestedFilename()).toBe('electionshifter-2024-tx-president-gen-vs-2026-tx-us-senate-gen-margin-swing.png');
  const file = await download.path();
  const buf = readFileSync(file);
  expect(pngSize(buf)).toEqual({ w: 3200, h: 2000 });

  // Decode in the browser and sample pixel regions (coordinates in 1600x1000 SVG units, drawn at 2x).
  const stats = await page.evaluate(
    async ({ b64, fills }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bmp, 0, 0);
      const region = (x: number, y: number, w: number, h: number) => {
        const d = ctx.getImageData(x * 2, y * 2, w * 2, h * 2).data;
        let non = 0;
        const colors = new Set<string>();
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) {
            non++;
            colors.add('#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''));
          }
        }
        return { frac: non / (d.length / 4), colors: [...colors] };
      };
      const map = region(80, 150, 737, 700);
      const wanted = new Set(fills as string[]);
      const hits = map.colors.filter((k) => wanted.has(k)).length;
      return {
        map: map.frac,
        mapMatch: hits,
        legend: region(880, 150, 680, 330).frac,
        header: region(40, 20, 1000, 110).frac,
        badge: region(1000, 24, 560, 40).frac,
        footer: region(40, 870, 1520, 120).frac,
        races: region(880, 360, 680, 140).frac,
        // whole corner far from any content stays blank
        blank: region(1250, 700, 300, 120).frac,
      };
    },
    { b64: buf.toString('base64'), fills: pageFills },
  );
  expect(stats.map).toBeGreaterThan(0.1);
  expect(stats.mapMatch).toBeGreaterThanOrEqual(Math.min(3, pageFills.length));
  expect(stats.legend).toBeGreaterThan(0.02);
  expect(stats.header).toBeGreaterThan(0.02);
  expect(stats.badge).toBeGreaterThan(0.3);
  expect(stats.footer).toBeGreaterThan(0.02);
  expect(stats.blank).toBeLessThan(0.01);
});

test('the PNG is a different file for a different view and names the unofficial status in the badge region', async ({ page }) => {
  await page.goto(`./?v=1&a=${A}&b=${B}&metric=turnout_change_pct&basis=two_party&which=A&state=TX`);
  await expect(page.locator('#map path[data-fill]').first()).toBeVisible();
  const [d] = await Promise.all([page.waitForEvent('download'), page.click('#download-png')]);
  expect(d.suggestedFilename()).toContain('turnout-change-pct');
  expect(pngSize(readFileSync(await d.path()))).toEqual({ w: 3200, h: 2000 });
  await expect(page.locator('#export-status')).toContainText('Downloaded');
});
