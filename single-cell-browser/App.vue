<template>
  <main :class="{ 'atlas-preview': preview, 'compact-browser': !preview && fullView.compact }">
    <div v-if="preview" class="preview-map">
      <ResearchUmapPlotGL v-if="view && webgl" :key="view.key" :group="view.key" :points="view.points" :labels="view.fields" :colors="colors" :cell-type-field="field" :color-by-field="field" :highlight-label="null" :hover-fields="[field]" :expression="view.expression" :height="previewHeight" :preview-labels="previewLabels" />
      <p v-else role="status">{{ error ? copy.preview_unavailable : loading ? copy.loading_preview : copy.preview_idle }}</p>
      <span v-if="previewCaption" class="preview-caption">{{ view ? view.count.toLocaleString() + ' ' + copy.preview_cells_label : 'PanKbase scRNA-seq' }}</span>
    </div>
    <p v-else-if="!context" role="status">Select an expression relationship in the graph to explore single cells.</p>
    <template v-else>
      <form class="explore-controls" @submit.prevent="search">
        <label class="gene-control"><span>{{ copy.gene_label }}</span><input v-model="geneInput" aria-label="Atlas gene" maxlength="80" autocomplete="off" spellcheck="false"><button class="primary" :disabled="loading || !geneInput.trim()">{{ copy.view_gene }}</button></label>
        <label class="highlight-control"><span>{{ copy.cell_label }}</span><select v-model="highlighted" @change="updateView" :disabled="!loaded"><option value="">{{ copy.all_cells }}</option><option v-for="label in cellTypes" :key="label" :value="label">{{ label }}</option></select><img :src="icons.select" alt="" /></label>
        <div class="cell-scope" role="group" :aria-label="copy.cell_scope"><button type="button" :aria-pressed="!filtered" @click="setFilter(false)">{{ copy.all_cells }}</button><button type="button" :aria-pressed="filtered" :disabled="!highlighted" @click="setFilter(true)">{{ copy.selected_cells }}</button></div>
      </form>
      <div class="browser-navigation">
        <nav :aria-label="copy.views_label"><button v-for="item in tabs" :key="item.id" :aria-label="item.label" :aria-pressed="tab === item.id" @click="selectTab(item.id)"><img :src="item.icon" alt="" /><span>{{ item.label }}</span></button></nav>
        <a v-if="fullView.external_browser.enabled" :href="sourceLink" target="_blank" rel="noopener noreferrer"><span>{{ copy.header_browser_link.replace(/\s*[→↗]\s*$/, '') }}</span><span class="external-icon"><img :src="icons.external" alt="" /></span></a>
      </div>
      <div class="browser-stage" :class="{ 'is-short': plotAreaHeight > 0 && plotAreaHeight < 160 }">
      <div ref="browserContent" class="browser-content">
      <div class="context-note"><strong>{{ copy.atlas_label }}</strong><span v-if="fullView.show_context_note">{{ copy.context_note }}</span><span v-if="gene !== context.geneSymbol">Graph gene: {{ context.geneSymbol }}. Now exploring: {{ gene }}.</span></div>
      <div v-if="loading" class="load-state" role="status"><span class="spinner" aria-hidden="true"></span><div><strong>{{ loaded ? `Loading ${gene} expression…` : 'Preparing the cell atlas…' }}</strong><small>{{ loaded ? 'The map will appear with expression colors when loading finishes.' : 'Loads a compact map containing coordinates and cell types, then expression for the selected gene.' }}</small></div></div>
      <div v-if="error" class="error-state" role="alert"><strong>Expression could not be loaded</strong><p>{{ error }}</p><button @click="load(gene)">Retry</button></div>
      <template v-if="view">

        <section v-show="tab === 'Cell map'" aria-label="Cell map" class="plot-card map-card">
          <p v-if="!webgl" role="alert">WebGL is unavailable. Expression distributions and source information remain available.</p>
          <ResearchUmapPlotGL ref="map" :show-controls="false" :legend-label="copy.map_expression_legend.replace('{gene}', gene)" @viewport-change="mapZoom = $event.zoom" v-if="webgl && view.expression" :key="view.key" :group="view.key" :points="view.points" :labels="view.fields" :colors="colors" :cell-type-field="field" :color-by-field="field" :highlight-label="highlighted" :visible-mask="view.mask" :hover-fields="[field]" :expression="view.expression" :height="plotHeight" />

          <p v-if="view.expression" class="plot-caption">{{ copy.map_expression_caption }}</p>
        </section>
        <section v-show="tab === 'Expression'" aria-label="Expression distribution" class="plot-card">
          <div class="plot-heading"><div><h2>{{ gene }} expression by cell type</h2><p>{{ copy.expression_description }}</p></div><span v-if="fullView.show_expression_badge" class="pill">{{ copy.expression_badge }}</span></div>
          <p v-if="!view.expression">{{ error ? 'Choose another gene or retry above.' : 'Expression will appear here when loading finishes.' }}</p>
          <template v-else><div class="plot-scroll"><div class="violin"><ResearchViolinPlot v-if="visitedExpression" :key="view.key + gene" :data="view.stats" :primary-key="field" :colors="colors[field]" :highlight-key="highlighted" :height="340" x-axis-label="Cell type" y-axis-label="Log-normalized expression" :range="[0, maximum || 1]" /></div></div>
          <p class="plot-caption">Source log-normalized expression, including cells with zero detected expression. These distributions summarize cells, not donors; they do not establish differential expression.</p>
          <details><summary>View expression summary table</summary><div class="plot-scroll"><table><thead><tr><th>Cell type</th><th>Cells</th><th>Median</th><th>Middle 50% (Q1–Q3)</th></tr></thead><tbody><tr v-for="row in view.stats" :key="row[field]"><td>{{ row[field] }}</td><td>{{ row.count.toLocaleString() }}</td><td>{{ row.median.toFixed(3) }}</td><td>{{ row.q1.toFixed(3) }}–{{ row.q3.toFixed(3) }}</td></tr></tbody></table></div></details></template>
        </section>
      </template>
      <section v-show="tab === 'Source'" aria-label="Source provenance" class="plot-card provenance">
        <h2>Understand the source</h2><p>This atlas is related context, not a verified match to the graph’s source analysis. The atlas combines pancreatic islet cells from HPAP, IIDP and Prodo. Your graph’s condition is not automatically applied to these cells.</p>
        <dl><dt>Atlas release</dt><dd>{{ copy.atlas_label }}</dd><dt>Source dataset identifier</dt><dd>{{ context.datasetId }}</dd><dt>Graph source dataset</dt><dd>{{ context.edgeDatasetId || 'Not recorded' }}</dd><dt>Graph relationship</dt><dd>{{ context.geneSymbol }} → {{ context.cellType }} · {{ context.evidenceLabel }}</dd><dt>Graph evidence release</dt><dd>{{ context.edgeRelease || 'Not recorded' }}</dd><dt>Graph condition</dt><dd>{{ context.condition || 'Not recorded' }}</dd><dt>Expression values</dt><dd>Source log-normalized RNA expression. No conversion to donor CPM or inference of differential expression.</dd><dt>Cell alignment</dt><dd>Source positional-vector contract. Coordinate, cell-type and expression lengths are checked against the catalog. The compact map preserves every source cell in original order; no cells are sampled. Coordinates do not include cell IDs for an independent barcode join.</dd><dt>Atlas retrieved</dt><dd>{{ loaded ? loaded.atlas.retrievedAt : 'Not loaded' }}</dd><dt>Local cache</dt><dd>{{ loaded && loaded.atlas.cacheHit ? 'Using a compact map saved in this browser.' : 'Compact map prepared from PanKbase.' }} Public coordinates and cell-type codes are cached for up to 24 hours. Donor metadata and cell IDs are not saved.</dd></dl>
        <div class="source-actions"><button :disabled="loading" @click="load(gene, true)">Refresh atlas data</button><a :href="sourceLink" target="_blank" rel="noopener noreferrer">Open PanKbase ↗</a><a href="https://data.pankbase.org/analysis-sets/PKBDS1349YHGQ/" target="_blank" rel="noopener noreferrer">Atlas analysis lineage ↗</a><a href="./THIRD_PARTY_NOTICES.txt" target="_blank" rel="noopener noreferrer">Code & licenses</a></div>
      </section>
      </div>
      <div v-if="tab === 'Cell map'" class="map-toolbar" role="toolbar" :aria-label="copy.map_tab">
        <button :aria-label="fullscreen ? copy.exit_fullscreen : copy.fullscreen" :title="fullscreen ? copy.exit_fullscreen : copy.fullscreen" @click="toggleFullscreen"><img :src="icons.fullscreen" alt="" /></button>
        <button :aria-label="copy.zoom_in" :title="copy.zoom_in" :disabled="!view || !view.expression || !webgl" @click="zoomMap(-1)"><img :src="icons.zoomIn" alt="" /></button>
        <button :aria-label="copy.zoom_out" :title="copy.zoom_out" :disabled="!view || !view.expression || !webgl" @click="zoomMap(1)"><img :src="icons.zoomOut" alt="" /></button>
      </div>
      </div>
      <footer class="browser-footer"><span><template v-if="view"><strong>{{ view.count.toLocaleString() }} {{ copy.cells_label }}</strong> · </template>{{ copy.map_caption }}</span><span class="navigation-hint">{{ mapZoom }}% · {{ copy.map_navigation }}</span></footer>
    </template>
  </main>
</template>
<script>
import mapIcon from './assets/sc-map-tab.svg';
import expressionIcon from './assets/sc-expression-tab.svg';
import sourceIcon from './assets/sc-source-tab.svg';
import selectIcon from './assets/sc-select-chevron.svg';
import externalIcon from './assets/sc-external-link.svg';
import fullscreenIcon from './assets/sc-fullscreen.svg';
import zoomInIcon from './assets/sc-zoom-in.svg';
import zoomOutIcon from './assets/sc-zoom-out.svg';
import ResearchUmapPlotGL from './vendor/ResearchUmapPlotGL.vue';
import ResearchViolinPlot from './vendor/ResearchViolinPlot.vue';
import { SC_CONFIG, SC_WORDING } from '../src/vnext/scBrowserConfig.js';
import { FIELD } from './data.mjs';
import { integratedBrowserLink } from './browserLink.mjs';
import { SC_PROTOCOL, validBrowserContext } from '../src/vnext/singleCellContext.js';
const EMBED_ORIGIN = window.parent.location.origin;
const palette = ['#007bff','#048845','#8490c8','#bf61a5','#ee3124','#b08d00','#5555ff','#7a9c1c','#bd505f','#9f78ac','#ab6684','#78a550'];
export default {
  components: { ResearchUmapPlotGL, ResearchViolinPlot },
  data: () => ({ viewportHeight: window.innerHeight, plotAreaHeight: 0, mapZoom: 100, fullscreen: false, icons: { select: selectIcon, external: externalIcon, fullscreen: fullscreenIcon, zoomIn: zoomInIcon, zoomOut: zoomOutIcon }, preview: document.querySelector('meta[name="pankgraph-preview"]')?.content === '1' || new URLSearchParams(window.location.search).get('preview') === '1', context: null, gene: '', geneInput: '', loading: false, error: '', loaded: null, view: null, tab: 'Cell map', visitedExpression: false, filtered: false, highlighted: '', request: 0, field: FIELD, copy: SC_WORDING, fullView: SC_CONFIG.full_view, previewHeight: SC_CONFIG.preview.height, previewLabels: SC_CONFIG.preview.labels, previewCaption: SC_CONFIG.preview.show_caption, webgl: true }),
  computed: {
    plotHeight() { return Math.max(100, (this.plotAreaHeight || this.viewportHeight - this.fullView.plot_reserved_height) - 56); },
    tabs() { return [{ id: 'Cell map', label: this.copy.map_tab, icon: mapIcon }, { id: 'Expression', label: this.copy.expression_tab, icon: expressionIcon }, { id: 'Source', label: this.copy.source_tab, icon: sourceIcon }]; },
    cellTypes() { return this.loaded?.atlas.labels || []; },
    colors() { return { [FIELD]: Object.fromEntries((this.loaded?.atlas.labels || []).map((label, index) => [label, palette[index % palette.length]])) }; },
    maximum() { return this.view ? Math.max(...this.view.stats.map(row => row.max)) : 0; },
    sourceLink() { return integratedBrowserLink(this.fullView.external_browser, this.context.datasetId, this.gene); },
  },
  mounted() {
    const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl'); this.webgl = !!gl; gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.worker = new Worker(new URL('./data.worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = ({ data }) => {
      if (data.request !== this.request) return;
      if (data.phase === 'atlas') { this.loaded = Object.freeze({ atlas: data.atlas, expression: null, stats: [] }); this.updateView(); return; }
      this.loading = false; this.error = data.error || '';
      if (!data.error) { this.loaded = Object.freeze(data.result); this.updateView(); }
      this.notify(data.error || '');
    };
    this.worker.onerror = () => { this.loading = false; this.error = 'Atlas worker failed. Reload the viewer to retry.'; this.notify(this.error); };
    this.resizeViewport = () => {
      this.viewportHeight = window.innerHeight;
      const content = this.$refs.browserContent;
      if (content && content.clientHeight > 0) this.plotAreaHeight = content.clientHeight;
    };
    this.contentObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(this.resizeViewport) : null;
    window.addEventListener('resize', this.resizeViewport);
    window.addEventListener('message', this.receive);
    window.parent.postMessage({ protocol: SC_PROTOCOL, type: 'ready' }, EMBED_ORIGIN);
  },
  beforeDestroy() { window.removeEventListener('resize', this.resizeViewport); window.removeEventListener('message', this.receive); this.contentObserver?.disconnect(); this.worker?.terminate(); },
  errorCaptured(error) { this.error = `Plot unavailable: ${error.message}`; this.notify(this.error); return false; },
  methods: {
    receive(event) {
      if (event.origin !== EMBED_ORIGIN || event.source !== window.parent || event.data?.protocol !== SC_PROTOCOL) return;
      if (event.data.type === 'fullscreen-state' && typeof event.data.fullscreen === 'boolean') { this.fullscreen = event.data.fullscreen; return; }
      if (event.data.type === 'resize') { this.$nextTick(() => window.dispatchEvent(new Event('resize'))); return; }
      if (event.data.type !== 'context' || !validBrowserContext(event.data.context)) return;
      const context = event.data.context;
      if (this.context?.edgeId === context.edgeId && this.context?.geneSymbol === context.geneSymbol && this.context?.datasetId === context.datasetId && this.context?.mappedCellType === context.mappedCellType) return;
      this.context = Object.freeze(context); this.filtered = false; this.highlighted = context.mappedCellType || ''; this.geneInput = context.geneSymbol;
      this.load(context.geneSymbol);
      this.$nextTick(() => { this.contentObserver?.disconnect(); if (this.$refs.browserContent) this.contentObserver?.observe(this.$refs.browserContent); this.resizeViewport(); });
    },
    notify(message) { window.parent.postMessage({ protocol: SC_PROTOCOL, type: 'status', edgeId: this.context?.edgeId, message }, EMBED_ORIGIN); },
    load(gene, refresh = false) { this.gene = gene.toUpperCase(); this.geneInput = this.gene; this.mapZoom = 100; this.loading = true; this.error = ''; if (this.loaded) { this.loaded = Object.freeze({ atlas: this.loaded.atlas, expression: null, stats: [] }); this.updateView(); } this.request += 1; this.worker.postMessage({ request: this.request, gene: this.gene, refresh, preview: this.preview && !SC_CONFIG.preview.load_expression }); },
    search() { this.load(this.geneInput.trim()); },
    selectTab(tab) { this.tab = tab; if (tab === 'Expression') this.visitedExpression = true; this.$nextTick(() => window.dispatchEvent(new Event('resize'))); },
    setFilter(filtered) { this.filtered = Boolean(filtered && this.highlighted); this.updateView(); },
    zoomMap(direction) { this.$refs.map?.onWheel({ deltaY: direction }); },
    toggleFullscreen() { window.parent.postMessage({ protocol: SC_PROTOCOL, type: 'toggle-fullscreen' }, EMBED_ORIGIN); },
    updateView() {
      if (!this.loaded) return;
      const { atlas, expression, stats } = this.loaded;
      const cellIndex = atlas.labels.indexOf(this.highlighted);
      if (cellIndex < 0) this.filtered = false;
      const mask = this.filtered ? Uint8Array.from(atlas.codes, code => code === cellIndex ? 1 : 0) : null;
      const count = mask ? mask.reduce((sum, value) => sum + value, 0) : atlas.points.count;
      // Freeze boundaries after structured cloning so Vue never walks every cell.
      this.view = Object.freeze({ key: this.context.datasetId, count, mask,
        points: Object.freeze(atlas.points),
        fields: Object.freeze({ metadata_labels: { [FIELD]: atlas.labels }, metadata: { [FIELD]: atlas.codes } }),
        expression: expression ? Object.freeze(expression) : null,
        stats: Object.freeze((this.filtered ? stats.filter(row => row[FIELD] === this.highlighted) : stats).map(row => Object.freeze({ ...row, exprValues: Object.freeze(row.exprValues), color: this.colors[FIELD][row[FIELD]] }))) });
      this.$nextTick(() => window.dispatchEvent(new Event('resize')));
    },
  },
};
</script>
<style src="./browser.css"></style>
