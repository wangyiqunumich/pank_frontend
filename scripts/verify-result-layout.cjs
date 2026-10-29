// Check layout in a fresh, isolated browser against the local navigation fixture.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const base = new URL(process.env.SC_QA_URL || 'http://127.0.0.1:4187');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname));
const output = process.env.SC_QA_OUTPUT || path.join(os.tmpdir(), 'pankgraph-result-layout');
fs.mkdirSync(output, { recursive: true });
const near = (actual, expected, label) => assert(Math.abs(actual - expected) < 1, `${label}: ${actual} != ${expected}`);

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const assertions = [];
  try {
    await page.addInitScript(() => {
      localStorage.setItem('pank-sidebar-open', 'false');
      localStorage.setItem('pank_feedback_auto_prompt_disabled_v1', '1');
    });
    await page.route(/https:\/\/(www\.)?(google-analytics|googletagmanager)\.com\//, route => route.abort());
    await page.goto(new URL('/result-new2?run_id=11111111-1111-4111-8111-111111111111', base).href);
    const left = page.locator('[id$="-ai-overview"]').first();
    const right = page.locator('[id$="-visual-material"]').first();
    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    await left.waitFor();
    await page.locator('.graph-viewer canvas').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    async function geometry() {
      return page.evaluate(() => {
        const rect = selector => {
          const element = document.querySelector(selector), box = element.getBoundingClientRect();
          const padding = parseFloat(getComputedStyle(element).paddingLeft);
          return { x: box.x + padding, y: box.y, width: box.width - padding, right: box.right };
        };
        return { left: rect('[id$="-ai-overview"]'), right: rect('[id$="-visual-material"]'),
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
    }
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const before = await geometry();
      near(before.left.y, before.right.y, 'Column top alignment');
      near(before.right.x - before.left.right, 24, 'Design gutter');
      assert(Math.abs((before.left.width + 24) / (before.right.width + 24) - 1.5) < 0.002, 'Grid tracks must use the 6:4 ratio');
      assert(!before.overflow, 'Desktop must not overflow horizontally');
      const collapsed = await sidebar.boundingBox();
      near(collapsed.width, 80, 'Collapsed rail');
      await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
      // Sample throughout the CSS transition, not just its endpoints.
      for (let sample = 0; sample < 8; sample++) {
        const during = await geometry();
        near(during.left.x, before.left.x, 'Overview stays still');
        near(during.left.width, before.left.width, 'Overview width stays still');
        near(during.right.x, before.right.x, 'Visual stays still');
        near(during.right.width, before.right.width, 'Visual width stays still');
        await page.waitForTimeout(40);
      }
      const expanded = await sidebar.boundingBox();
      near(expanded.x, collapsed.x, 'Sidebar horizontal anchor');
      near(expanded.y, collapsed.y, 'Sidebar vertical anchor');
      assert(expanded.width > before.left.x, 'Expanded sidebar must cover content');
      const coversContent = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('aside[aria-label="Main navigation"]'),
        { x: before.left.x + 10, y: expanded.y + 150 });
      assert(coversContent, 'Expanded sidebar must receive clicks above covered content');
      const coversComposer = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('aside[aria-label="Main navigation"]'),
        { x: before.left.x + 10, y: Math.min(expanded.y + expanded.height - 20, 980) });
      assert(coversComposer, 'Bottom composer must stay below the floating sidebar');
      if (width === 1280) await page.screenshot({ path: path.join(output, 'sidebar-expanded.png') });
      await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
      await page.waitForTimeout(250);
      if (width === 1280) await page.screenshot({ path: path.join(output, 'result-6-4.png') });
    }
    assertions.push('1280px and 1440px: 6:4 tracks, 24px gutter, stable content throughout sidebar animation, anchored floating panel receives clicks');
    for (const width of [1100, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const layout = await geometry();
      near(layout.left.x, layout.right.x, 'Stacked column alignment');
      near(layout.left.width, layout.right.width, 'Stacked column widths');
      assert(layout.right.y > layout.left.y, 'Narrow visual follows overview');
      assert(!layout.overflow, 'Narrow layout must not overflow horizontally');
      assert.equal(await sidebar.isVisible(), width >= 1000);
    }
    assertions.push('1100px, 768px and 390px: stacked columns, correct sidebar breakpoint, no horizontal overflow');
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: true, assertions }, null, 2));
    console.log(JSON.stringify({ passed: true, output, assertions }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
