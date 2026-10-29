// Isolated local-build acceptance. Never attach to an existing user browser.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const schema = require('../src/vnext/schema/result_page_schema.json');
const wording = schema.main_visuals.items.single_cell_browser.wording;
const copy = Object.fromEntries(Object.entries(wording).map(([key, value]) => [key, typeof value === 'string' ? value.replaceAll('{display_release}', wording.display_release) : value]));
const base = new URL(process.env.SC_QA_URL || 'http://127.0.0.1:4187');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'UI acceptance is loopback-only');
const output = process.env.SC_QA_OUTPUT || path.join(os.tmpdir(), 'pankgraph-scbrowser-qa');
fs.mkdirSync(output, { recursive: true });
const snapshot = (page, name) => page.screenshot({ path: path.join(output, name + '.png'), fullPage: false });
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const requests = [], errors = [], assertions = [];
  await page.addInitScript(() => localStorage.setItem('pank_feedback_auto_prompt_disabled_v1', '1'));
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  try {
    // Use the preview server's explicitly labeled graph fixture. Exercise real
    // public expression fallback, not the authenticated dev backend or inference.
    await page.route('**/api/scbrowser/expression?**', route => route.fulfill({ status: 503, json: { message: 'Local QA: exercise the existing public fallback.' } }));
    await page.route(/https:\/\/(www\.)?(google-analytics|googletagmanager)\.com\//, route => route.abort());
    await page.goto(new URL('/result-new2?run_id=11111111-1111-4111-8111-111111111111', base).href);
    await page.getByRole('tab', { name: 'scBrowser', exact: true }).waitFor({ timeout: 30000 });
    assert.equal(await page.locator('iframe[title="PanKbase atlas preview"]').count(), 0);
    assert.equal(await page.getByRole('region', { name: 'Expression evidence' }).count(), 0);
    assertions.push('No duplicate scBrowser preview');

    async function graphGeometry() {
      const geometry = await page.locator('.graph-viewer').evaluate(viewer => {
        const box = viewer.getBoundingClientRect();
        const legend = viewer.querySelector('.graph-legend').getBoundingClientRect();
        const zoom = viewer.querySelector('.graph-zoom-indicator').getBoundingClientRect();
        const toolbar = viewer.querySelector('.graph-toolbar');
        const dock = toolbar.getBoundingClientRect();
        return { legendBottom: box.bottom - legend.bottom, zoomBottom: box.bottom - zoom.bottom,
          scroll: toolbar.scrollHeight > toolbar.clientHeight + 1,
          toolbarInside: dock.top >= box.top - 1 && dock.bottom <= box.bottom + 1 };
      });
      assert(Math.abs(geometry.legendBottom - 16) < 1, JSON.stringify(geometry));
      assert(Math.abs(geometry.zoomBottom - 16) < 1, JSON.stringify(geometry));
      assert(!geometry.scroll && geometry.toolbarInside, JSON.stringify(geometry));
      return geometry;
    }
    const graphCanvas = await page.locator('.graph-viewer canvas').first().elementHandle();
    await page.locator('.graph-toolbar').getByRole('button', { name: 'Expand graph toolbar' }).click();
    await graphGeometry();
    await page.locator('.graph-viewer').screenshot({ path: path.join(output, 'graph-panel.png') });
    await page.locator('.graph-toolbar').getByRole('button', { name: 'Open in full screen' }).click();
    await page.locator('dialog:modal').waitFor();
    assert(await graphCanvas.evaluate(canvas => canvas.isConnected && !!canvas.closest('dialog')?.matches(':modal')));
    await page.setViewportSize({ width: 844, height: 320 });
    await graphGeometry();
    await snapshot(page, 'graph-short-fullscreen');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('dialog:modal').waitFor({ state: 'hidden' });
    assertions.push('Graph footer corners, expanded dock without scrolling, retained fullscreen canvas and Escape');

    await page.getByRole('tab', { name: 'scBrowser', exact: true }).click();
    const iframe = await page.locator('iframe[title="PanKgraph single-cell browser"]').elementHandle();
    const surface = await iframe.evaluate(element => {
      const panel = element.closest('.MuiPaper-root');
      const style = getComputedStyle(panel);
      return { background: style.backgroundColor, border: style.borderTopColor };
    });
    assert.deepEqual(surface, { background: 'rgb(255, 255, 255)', border: 'rgba(226, 232, 240, 0.9)' });
    assertions.push('scBrowser outer shell matches the white Figma surface and slate outline');
    const frame = await iframe.contentFrame();
    await frame.getByRole('button', { name: copy.view_gene, exact: true }).waitFor({ timeout: 30000 });
    await frame.getByText('448,935 cells', { exact: false }).first().waitFor({ timeout: 90000 });
    await frame.locator('.load-state').waitFor({ state: 'hidden', timeout: 90000 });
    await frame.locator('canvas').first().waitFor({ timeout: 90000 });
    assert.equal(await frame.getByLabel('Atlas gene').inputValue(), 'INS');
    await frame.getByText(copy.atlas_label, { exact: true }).first().waitFor();
    assertions.push('Actual public INS expression, all 448935 cells, schema release label');

    async function controlLayout() {
      const layout = await frame.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        const select = document.querySelector('.highlight-control select'), style = getComputedStyle(select);
        const text = document.createElement('canvas').getContext('2d'); text.font = style.font;
        return { width: innerWidth, header: rect('.browser-header'), atlas: rect('.browser-header strong'),
          link: rect('.browser-header > a'), gene: rect('.gene-control'), highlight: rect('.highlight-control'),
          scope: rect('.cell-scope'), nav: rect('.browser-navigation'), stage: rect('.browser-stage'),
          input: rect('.gene-control input'), buttons: document.querySelectorAll('.cell-scope button').length,
          selected: select.value, optionWidth: text.measureText(select.selectedOptions[0].text).width,
          selectWidth: select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) };
      });
      assert.equal(layout.buttons, 1, 'Selected is one reversible toggle');
      if (layout.selected === 'Beta') assert(layout.selectWidth >= layout.optionWidth, 'The design cell label must fit without truncation: ' + JSON.stringify(layout));
      assert(layout.header.bottom <= layout.gene.y && layout.nav.bottom <= layout.stage.y + 1);
      if (layout.width >= 400) {
        assert(Math.abs(layout.gene.y - layout.highlight.y) < 1 && Math.abs(layout.gene.y - layout.scope.y) < 1, JSON.stringify(layout));
        assert(Math.abs(layout.highlight.width - 119) < 1, JSON.stringify(layout));
        assert(Math.abs(layout.gene.height - 32) < 1 && Math.abs(layout.scope.height - 32) < 1);
        assert(Math.abs(layout.atlas.y - layout.link.y) < 1, JSON.stringify(layout));
      } else {
        assert(layout.highlight.y > layout.gene.y && Math.abs(layout.highlight.y - layout.scope.y) < 1, JSON.stringify(layout));
      }
      return layout;
    }

    async function scGeometry() {
      await frame.waitForFunction(() => {
        const stage = document.querySelector('.browser-stage')?.getBoundingClientRect();
        const dock = document.querySelector('.map-toolbar')?.getBoundingClientRect();
        return stage && dock && dock.top >= stage.top - 1 && dock.bottom <= stage.bottom + 1;
      }, null, { timeout: 10000 });
      const geometry = await frame.evaluate(() => {
        const stage = document.querySelector('.browser-stage').getBoundingClientRect();
        const toolbar = document.querySelector('.map-toolbar').getBoundingClientRect();
        const root = document.querySelector('main').getBoundingClientRect();
        const images = [...document.querySelectorAll('img')].map(image => ({ width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }));
        return { stage: stage.toJSON(), toolbar: toolbar.toJSON(), toolbarInside: toolbar.top >= stage.top - 1 && toolbar.bottom <= stage.bottom + 1,
          rootInside: root.width <= innerWidth + 1, horizontalOverflow: document.body.scrollWidth > innerWidth + 1, images };
      });
      assert(geometry.toolbarInside && geometry.rootInside && !geometry.horizontalOverflow, JSON.stringify(geometry));
      geometry.images.forEach(image => { assert(image.naturalWidth > 0 && image.naturalHeight > 0, JSON.stringify(image)); assert(Math.abs(image.width - image.naturalWidth) < 1 && Math.abs(image.height - image.naturalHeight) < 1, JSON.stringify(image)); });
      return geometry;
    }
    await scGeometry();
    await controlLayout();
    await page.setViewportSize({ width: 1280, height: 1000 });
    await controlLayout();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await snapshot(page, 'scbrowser-map');
    const shell = await iframe.evaluateHandle(element => element.closest('.MuiPaper-root'));
    await shell.asElement().screenshot({ path: path.join(output, 'scbrowser-shell.png') });
    await shell.dispose();
    const retainedMap = await frame.locator('canvas').first().elementHandle();
    await frame.getByRole('button', { name: copy.fullscreen, exact: true }).click();
    await page.locator('dialog:modal').waitFor();
    await controlLayout();
    assert(await iframe.evaluate(element => element.isConnected && !!element.closest('dialog')?.matches(':modal')));
    await frame.getByRole('button', { name: copy.exit_fullscreen, exact: true }).waitFor();
    await snapshot(page, 'scbrowser-fullscreen');
    await frame.getByRole('button', { name: copy.zoom_in, exact: true }).click();
    await frame.waitForFunction(() => !document.querySelector('.navigation-hint').textContent.startsWith('100%'));
    await frame.getByRole('button', { name: copy.exit_fullscreen, exact: true }).click();
    await page.locator('dialog:modal').waitFor({ state: 'hidden' });
    await frame.getByRole('button', { name: copy.fullscreen, exact: true }).click();
    await page.locator('dialog:modal').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('dialog:modal').waitFor({ state: 'hidden' });
    assert(await retainedMap.evaluate(canvas => canvas.isConnected));
    assertions.push('Persistent scBrowser fullscreen iframe and functional zoom readout');

    const map = await frame.locator('canvas').first().elementHandle();
    await frame.getByRole('button', { name: copy.expression_tab, exact: true }).click();
    await frame.getByRole('region', { name: 'Expression distribution' }).locator('svg').first().waitFor();
    await snapshot(page, 'scbrowser-expression');
    await frame.getByRole('button', { name: copy.source_tab, exact: true }).click();
    await frame.getByText('Understand the source', { exact: true }).waitFor();
    await frame.getByRole('button', { name: copy.map_tab, exact: true }).click();
    assert(await map.evaluate(canvas => canvas.isConnected));
    await frame.locator('select').selectOption('Ductal');
    await frame.getByRole('button', { name: copy.selected_cells, exact: true }).click();
    const count = await frame.locator('.browser-footer strong').textContent();
    assert(count && !count.includes('448,935') && !count.startsWith('0 '), count);
    await frame.getByRole('button', { name: copy.selected_cells, exact: true }).click();
    await frame.getByText('448,935 cells', { exact: false }).first().waitFor();
    await frame.getByLabel('Atlas gene').fill('GCG');
    await frame.getByRole('button', { name: copy.view_gene, exact: true }).click();
    await frame.locator('.load-state').waitFor({ state: 'hidden', timeout: 90000 });
    await frame.locator('canvas').first().waitFor({ timeout: 90000 });
    assertions.push('Real violin, source tab, persistent map, selected-cell mask and GCG search');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('iframe[title="PanKgraph single-cell browser"]').scrollIntoViewIfNeeded();
    await scGeometry();
    await controlLayout();
    await frame.getByRole('button', { name: copy.fullscreen, exact: true }).click();
    await page.locator('dialog:modal').waitFor();
    await scGeometry();
    await snapshot(page, 'scbrowser-mobile');
    await frame.getByRole('button', { name: copy.exit_fullscreen, exact: true }).click();
    await page.locator('dialog:modal').waitFor({ state: 'hidden' });
    await page.getByRole('tab', { name: 'Knowledge Graph', exact: true }).click();
    await graphGeometry();
    await page.locator('.graph-viewer').screenshot({ path: path.join(output, 'graph-mobile.png') });
    await page.getByRole('tab', { name: 'scBrowser', exact: true }).click();
    assert.equal(await frame.getByLabel('Atlas gene').inputValue(), 'GCG');
    assertions.push('Narrow schema copy stays inside unchanged panel; mobile fullscreen and graph/browser round trips preserve state');

    assert(!requests.some(url => /fields.json|coordinates.tsv|dataset_metadata/.test(url)), 'Full metadata must not reach the browser');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: true, assertions, requests, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, output, assertions }, null, 2));
  } catch (error) {
    await snapshot(page, 'failure').catch(() => {});
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: false, assertions, requests, errors, failure: error.stack }, null, 2));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
