import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import { fireEvent, within } from '@testing-library/dom';
import { SC_CONFIG, SC_WORDING } from './scBrowserConfig';

// Compile the real Vue template into jsdom. Only the expensive WebGL/violin
// renderers and network lifecycle are stubbed; UI bindings/methods are real.
const runtime = join(__dirname, '../../single-cell-browser/node_modules/vue/dist/vue.common.js');
const Vue = existsSync(runtime) ? require(runtime) : null;
if (Vue) { Vue.config.productionTip = false; Vue.config.devtools = false; }
// Root-only installs may omit the independently built iframe runtime.
// npm run build:scbrowser enables this integration suite; unit suites still run.
const uiTest = Vue ? test : test.skip;
const source = readFileSync(join(__dirname, '../../single-cell-browser/App.vue'), 'utf8').replace(/\r\n/g, '\n');
const template = source.slice('<template>'.length, source.indexOf('\n</template>'));
const script = source.split('<script>')[1].split('</script>')[0].replace(/^import .*;$/gm, '').replaceAll('import.meta.url', 'window.location.href').replace('export default ', 'component = ');
const FIELD = 'Cell Type';
const onWheel = jest.fn();
const map = { props: ['height', 'showControls', 'legendLabel'], methods: { onWheel }, render(h) { return h('canvas', { attrs: { 'data-umap': 'true' } }); } };
const sandbox = { window, document, URLSearchParams, Event, SC_CONFIG, SC_WORDING, FIELD,
  SC_PROTOCOL: 'pankgraph.scbrowser.v1', validBrowserContext: () => true,
  ResearchUmapPlotGL: map, ResearchViolinPlot: { render: h => h('div') },
  integratedBrowserLink: () => 'https://pankbase.org/single-cell.html',
  mapIcon: 'map.svg', expressionIcon: 'expression.svg', sourceIcon: 'source.svg', selectIcon: 'select.svg',
  externalIcon: 'external.svg', fullscreenIcon: 'fullscreen.svg', zoomInIcon: 'zoom-in.svg', zoomOutIcon: 'zoom-out.svg' };
vm.runInNewContext(script, sandbox);
const component = sandbox.component;
let app;
const tick = () => Vue.nextTick();
beforeEach(async () => {
  if (!Vue) return;
  jest.clearAllMocks();
  const initial = component.data();
  app = new Vue({ ...component, ...Vue.compile(template), mounted: [], beforeDestroy: [],
    data: () => ({ ...initial, context: { datasetId: 'fixture', geneSymbol: 'CFTR', cellType: 'Beta' },
      gene: 'CFTR', geneInput: 'CFTR', highlighted: 'Beta',
      loaded: Object.freeze({ atlas: { labels: ['Beta', 'Ductal'], codes: new Uint8Array([0, 1, 0]), points: { count: 3 } },
        expression: [1, 0, 2], stats: [{ [FIELD]: 'Beta', count: 2, median: 1.5, q1: 1, q3: 2, max: 2, exprValues: [1, 2] }] }) }) });
  document.body.appendChild(app.$mount().$el);
  app.updateView(); await tick();
});
afterEach(() => { if (app) { app.$destroy(); app.$el.remove(); } });

uiTest('actual scBrowser controls retain schema copy and put the dock inside the content stage', () => {
  const ui = within(app.$el);
  expect(ui.getByText(SC_WORDING.gene_label)).toBeTruthy();
  expect(ui.getByText(SC_WORDING.cell_label)).toBeTruthy();
  expect(ui.getByRole('button', { name: SC_WORDING.view_gene })).toBeTruthy();
  const nav = ui.getByRole('navigation', { name: SC_WORDING.views_label });
  [SC_WORDING.map_tab, SC_WORDING.expression_tab, SC_WORDING.source_tab].forEach(name => expect(within(nav).getByRole('button', { name })).toBeTruthy());
  const stage = app.$el.querySelector('.browser-stage');
  expect(ui.getByRole('toolbar').parentElement).toBe(stage);
  expect(stage.contains(nav)).toBe(false);
  expect(stage.contains(app.$el.querySelector('footer'))).toBe(false);
  const header = app.$el.querySelector('.browser-header');
  expect(within(header).getByText(SC_WORDING.atlas_label)).toBeTruthy();
  expect(within(header).getByRole('link', { name: SC_WORDING.header_browser_link.replace(/\s*[→↗]\s*$/, '') })).toBeTruthy();
  expect(header.nextElementSibling).toBe(app.$el.querySelector('.explore-controls'));
  expect(app.$refs.map.showControls).toBe(false);
  expect(app.$refs.map.legendLabel).toBe(SC_WORDING.map_expression_legend.replace('{gene}', 'CFTR'));
});

uiTest('cell scope buttons operate the original mask and denominators without replacing the canvas', async () => {
  const scope = within(within(app.$el).getByRole('group', { name: SC_WORDING.cell_scope }));
  expect(scope.getAllByRole('button')).toHaveLength(1);
  const canvas = app.$el.querySelector('canvas');
  fireEvent.click(scope.getByRole('button', { name: SC_WORDING.selected_cells })); await tick();
  expect(app.filtered).toBe(true); expect(app.view.count).toBe(2);
  expect(scope.getByRole('button', { name: SC_WORDING.selected_cells }).getAttribute('aria-pressed')).toBe('true');
  expect(Array.from(app.view.mask)).toEqual([1, 0, 1]);
  fireEvent.click(scope.getByRole('button', { name: SC_WORDING.selected_cells })); await tick();
  expect(app.filtered).toBe(false); expect(app.view.count).toBe(3); expect(app.view.mask).toBeNull();
  expect(scope.getByRole('button', { name: SC_WORDING.selected_cells }).getAttribute('aria-pressed')).toBe('false');
  expect(app.$el.querySelector('canvas')).toBe(canvas);
});

uiTest('view switching retains the map; zoom and fullscreen call the actual host bridge', async () => {
  const ui = within(app.$el), canvas = app.$el.querySelector('canvas');
  const nav = within(ui.getByRole('navigation'));
  fireEvent.click(nav.getByRole('button', { name: SC_WORDING.expression_tab })); await tick();
  expect(app.tab).toBe('Expression'); expect(app.visitedExpression).toBe(true);
  fireEvent.click(nav.getByRole('button', { name: SC_WORDING.source_tab })); await tick();
  expect(app.tab).toBe('Source'); expect(ui.getByText('Understand the source')).toBeTruthy();
  fireEvent.click(nav.getByRole('button', { name: SC_WORDING.map_tab })); await tick();
  expect(app.$el.querySelector('canvas')).toBe(canvas);
  fireEvent.click(ui.getByRole('button', { name: SC_WORDING.zoom_in }));
  fireEvent.click(ui.getByRole('button', { name: SC_WORDING.zoom_out }));
  expect(onWheel.mock.calls.map(([event]) => event.deltaY)).toEqual([-1, 1]);
  const post = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  fireEvent.click(ui.getByRole('button', { name: SC_WORDING.fullscreen }));
  expect(post).toHaveBeenCalledWith({ protocol: 'pankgraph.scbrowser.v1', type: 'toggle-fullscreen' }, window.location.origin);
  app.receive({ origin: window.location.origin, source: window.parent, data: { protocol: 'pankgraph.scbrowser.v1', type: 'fullscreen-state', fullscreen: true } }); await tick();
  expect(ui.getByRole('button', { name: SC_WORDING.exit_fullscreen })).toBeTruthy();
  post.mockRestore();
});

uiTest('search preserves the worker contract and resets the displayed camera baseline', async () => {
  app.worker = { postMessage: jest.fn() }; app.mapZoom = 200;
  fireEvent.input(within(app.$el).getByRole('textbox', { name: 'Atlas gene' }), { target: { value: ' ins ' } });
  fireEvent.submit(app.$el.querySelector('form')); await tick();
  expect(app.worker.postMessage).toHaveBeenCalledWith({ request: 1, gene: 'INS', refresh: false, preview: false });
  expect(app.mapZoom).toBe(100); expect(app.gene).toBe('INS');
});

uiTest('actual styles bottom-anchor graph UI and keep scBrowser dock out of the navigation/footer', () => {
  const style = document.createElement('style');
  style.textContent = ['GraphToolbar.css', 'GraphLegend.css'].map(name => readFileSync(join(__dirname, name), 'utf8')).join('\n')
    + readFileSync(join(__dirname, '../../single-cell-browser/browser.css'), 'utf8');
  document.head.appendChild(style);
  const graph = document.createElement('div'); graph.className = 'graph-viewer';
  const legend = document.createElement('aside'); legend.className = 'graph-legend';
  const zoom = document.createElement('div'); zoom.className = 'graph-zoom-indicator';
  const toolbar = document.createElement('div'); toolbar.className = 'graph-toolbar';
  graph.append(legend, zoom, toolbar); document.body.appendChild(graph);
  try {
    expect(getComputedStyle(legend).bottom).toBe('16px'); expect(getComputedStyle(legend).top).not.toBe('24px');
    expect(getComputedStyle(zoom).bottom).toBe('16px'); expect(getComputedStyle(zoom).top).not.toBe('24px');
    expect(getComputedStyle(toolbar).overflow).toBe('visible');
    expect(getComputedStyle(app.$el.querySelector('.browser-stage')).position).toBe('relative');
    expect(getComputedStyle(app.$el.querySelector('.map-toolbar')).top).toBe('50%');
    expect(getComputedStyle(app.$el.querySelector('.map-toolbar')).transform).toBe('translateY(-50%)');
    expect(getComputedStyle(app.$el.querySelector('nav')).flexWrap).toBe('nowrap');
    expect(getComputedStyle(app.$el.querySelector('nav')).overflowX).toBe('auto');
  } finally { graph.remove(); style.remove(); }
});

uiTest('every scBrowser design icon has a nonempty local SVG with the original root dimensions', () => {
  const expected = { 'sc-map-tab': [14, 14], 'sc-expression-tab': [14, 14], 'sc-source-tab': [14, 14],
    'sc-select-chevron': [9.33333, 5.25], 'sc-external-link': [9, 9], 'sc-fullscreen': [16, 16], 'sc-zoom-in': [16, 16], 'sc-zoom-out': [16, 16] };
  Object.entries(expected).forEach(([name, size]) => {
    const svg = readFileSync(join(__dirname, `../../single-cell-browser/assets/${name}.svg`), 'utf8');
    const root = svg.match(/<svg[^>]*>/)[0];
    expect(root.length).toBeGreaterThan(20);
    expect([Number(root.match(/width="([^"]+)"/)[1]), Number(root.match(/height="([^"]+)"/)[1])]).toEqual(size);
    expect(source).toContain(`./assets/${name}.svg`);
  });
  expect(app.$el.querySelectorAll('img')).toHaveLength(Object.keys(expected).length);
});
