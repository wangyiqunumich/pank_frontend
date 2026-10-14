<template>
  <main :class="{ 'atlas-preview': preview }">
    <div v-if="preview" class="preview-map">
      <ResearchUmapPlotGL v-if="view && webgl" :key="view.key" :group="view.key" :points="view.points" :labels="view.fields" :colors="colors" :cell-type-field="field" :color-by-field="field" :highlight-label="null" :hover-fields="[field]" :expression="view.expression" :height="previewHeight" :preview-labels="previewLabels" />
      <p v-else role="status">{{ error ? copy.preview_unavailable : loading ? copy.loading_preview : copy.preview_idle }}</p>
      <span v-if="previewCaption" class="preview-caption">{{ view ? view.count.toLocaleString() + ' ' + copy.preview_cells_label : 'PanKbase scRNA-seq' }}</span>
    </div>
    <p v-else-if="!context" role="status">Select an expression relationship in the graph to explore single cells.</p>
    <template v-else>
      <div class="browser-content">
      <div class="context-note"><strong>{{ copy.atlas_label }}</strong><span>{{ copy.context_note }}</span><span v-if="gene !== context.geneSymbol">Graph gene: {{ context.geneSymbol }}. Now exploring: {{ gene }}.</span></div>
      <form class="explore-controls" @submit.prevent="search">
        <label>{{ copy.gene_label }} <div class="gene-search"><input v-model="geneInput" aria-label="Atlas gene" placeholder="e.g. INS" maxlength="80" autocomplete="off" spellcheck="false"><button class="primary" :disabled="loading">{{ copy.view_gene }}</button></div></label>
        <label>{{ copy.cell_label }} <select v-model="highlighted" @change="updateView" :disabled="!loaded"><option value="">{{ copy.all_cells }}</option><option v-for="label in cellTypes" :key="label" :value="label">{{ label }}</option></select></label>
        
      </form>
      <div v-if="loading" class="load-state" role="status"><span class="spinner" aria-hidden="true"></span><div><strong>{{ loaded ? `Loading ${gene} expression…` : 'Preparing the cell atlas…' }}</strong><small>{{ loaded ? 'The map will appear with expression colors when loading finishes.' : 'Loads a compact map containing coordinates and cell types, then expression for the selected gene.' }}</small></div></div>
      <div v-if="error" class="error-state" role="alert"><strong>Expression could not be loaded</strong><p>{{ error }}</p><button @click="load(gene)">Retry</button></div>
      <template v-if="view">
        <div class="filters"><span><strong>{{ view.count.toLocaleString() }} cells</strong> · {{ filtered ? highlighted : 'All cells' }}</span><button v-if="highlighted" :aria-pressed="filtered" @click="toggleFilter">{{ filtered ? 'Show all cells' : `Filter to ${highlighted}` }}</button></div>
        <section v-show="tab === 'Cell map'" aria-label="Cell map" class="plot-card">
          <p v-if="!webgl" role="alert">WebGL is unavailable. Expression distributions and source information remain available.</p>
          <ResearchUmapPlotGL v-if="webgl && view.expression" :key="view.key" :group="view.key" :points="view.points" :labels="view.fields" :colors="colors" :cell-type-field="field" :color-by-field="field" :highlight-label="highlighted" :visible-mask="view.mask" :hover-fields="[field]" :expression="view.expression" :height="plotHeight" />
          <p class="plot-caption">Each dot = one cell · Scroll to zoom · Drag to move</p>
          <p v-if="view.expression" class="plot-caption">Gray = no detected expression · Blue = higher source log-normalized expression. Overlapping cells can hide individual dots.</p>
        </section>
        <section v-show="tab === 'Expression'" aria-label="Expression distribution" class="plot-card">
          <div class="plot-heading"><div><h2>{{ gene }} expression by cell type</h2><p>The width of each violin shows how many cells have similar expression. The box marks the middle 50% of cells.</p></div><span class="pill">Cell-level · Includes zeros</span></div>
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
      <nav aria-label="Single-cell views"><button v-for="name in ['Cell map','Expression','Source']" :key="name" :aria-label="name" :aria-pressed="tab === name" @click="selectTab(name)">{{ name === 'Source' ? copy.source_tab : name === 'Expression' ? copy.expression_tab : copy.map_tab }}</button></nav>
    </template>
  </main>
</template>
<script>
import ResearchUmapPlotGL from './vendor/ResearchUmapPlotGL.vue';
import ResearchViolinPlot from './vendor/ResearchViolinPlot.vue';
import { SC_CONFIG, SC_WORDING } from '../src/vnext/scBrowserConfig.js';
import { FIELD } from './data.mjs';
import { SC_PROTOCOL, validBrowserContext } from '../src/vnext/singleCellContext.js';
const EMBED_ORIGIN = window.parent.location.origin;
const palette = ['#007bff','#048845','#8490c8','#bf61a5','#ee3124','#b08d00','#5555ff','#7a9c1c','#bd505f','#9f78ac','#ab6684','#78a550'];
export default {
  components: { ResearchUmapPlotGL, ResearchViolinPlot },
  data: () => ({ viewportHeight: window.innerHeight, preview: document.querySelector('meta[name="pankgraph-preview"]')?.content === '1' || new URLSearchParams(window.location.search).get('preview') === '1', context: null, gene: '', geneInput: '', loading: false, error: '', loaded: null, view: null, tab: 'Cell map', visitedExpression: false, filtered: false, highlighted: '', request: 0, field: FIELD, copy: SC_WORDING, previewHeight: SC_CONFIG.preview.height, previewLabels: SC_CONFIG.preview.labels, previewCaption: SC_CONFIG.preview.show_caption, webgl: true }),
  computed: {
    plotHeight() { return Math.max(150, this.viewportHeight - 190); },
    cellTypes() { return this.loaded?.atlas.labels || []; },
    colors() { return { [FIELD]: Object.fromEntries((this.loaded?.atlas.labels || []).map((label, index) => [label, palette[index % palette.length]])) }; },
    maximum() { return this.view ? Math.max(...this.view.stats.map(row => row.max)) : 0; },
    sourceLink() { return `https://pankbase.org/single-cell.html?datasetId=${encodeURIComponent(this.context.datasetId)}&gene=${encodeURIComponent(this.gene)}`; },
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
    this.resizeViewport = () => { this.viewportHeight = window.innerHeight; };
    window.addEventListener('resize', this.resizeViewport);
    window.addEventListener('message', this.receive);
    window.parent.postMessage({ protocol: SC_PROTOCOL, type: 'ready' }, EMBED_ORIGIN);
  },
  beforeDestroy() { window.removeEventListener('resize', this.resizeViewport); window.removeEventListener('message', this.receive); this.worker?.terminate(); },
  errorCaptured(error) { this.error = `Plot unavailable: ${error.message}`; this.notify(this.error); return false; },
  methods: {
    receive(event) {
      if (event.origin !== EMBED_ORIGIN || event.source !== window.parent || event.data?.protocol !== SC_PROTOCOL) return;
      if (event.data.type === 'resize') { this.$nextTick(() => window.dispatchEvent(new Event('resize'))); return; }
      if (event.data.type !== 'context' || !validBrowserContext(event.data.context)) return;
      const context = event.data.context;
      if (this.context?.edgeId === context.edgeId && this.context?.geneSymbol === context.geneSymbol && this.context?.datasetId === context.datasetId && this.context?.mappedCellType === context.mappedCellType) return;
      this.context = Object.freeze(context); this.filtered = false; this.highlighted = context.mappedCellType || ''; this.geneInput = context.geneSymbol;
      this.load(context.geneSymbol);
    },
    notify(message) { window.parent.postMessage({ protocol: SC_PROTOCOL, type: 'status', edgeId: this.context?.edgeId, message }, EMBED_ORIGIN); },
    load(gene, refresh = false) { this.gene = gene.toUpperCase(); this.geneInput = this.gene; this.loading = true; this.error = ''; if (this.loaded) { this.loaded = Object.freeze({ atlas: this.loaded.atlas, expression: null, stats: [] }); this.updateView(); } this.request += 1; this.worker.postMessage({ request: this.request, gene: this.gene, refresh, preview: this.preview && !SC_CONFIG.preview.load_expression }); },
    search() { this.load(this.geneInput.trim()); },
    selectTab(tab) { this.tab = tab; if (tab === 'Expression') this.visitedExpression = true; this.$nextTick(() => window.dispatchEvent(new Event('resize'))); },
    toggleFilter() { this.filtered = !this.filtered; this.updateView(); },
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
