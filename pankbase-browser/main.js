import Vue from 'vue';
import './style.css';

const protocol = 'pankgraph.pankbase.v1';
const modules = {
  genome_browser: () => import('./vendor/genome/AtacSeq.vue'),
  differential_expression: () => import('./DifferentialExpression.vue'),
  functional_browser: () => import('./FunctionalBrowser.vue'),
  pca_explorer: () => import('./PcaExplorer.vue'),
};
const app = new Vue({
  data: { component: null, context: null, moduleId: '', error: '', serial: 0 },
  render(h) {
    if (this.error) return h('p', { attrs: { role: 'alert' } }, this.error);
    if (!this.component) return h('p', { attrs: { role: 'status' } }, 'Preparing view…');
    const context = this.context;
    return h('main', { attrs: { id: 'app' } }, [h(this.component, { key: JSON.stringify([this.moduleId, context.recordId, context.geneSymbol, context.cellType, context.datasetId, context.locus]), props: {
      context, gene: context.geneSymbol, locus: context.locus, cellType: context.cellType,
      config: { gene: context.geneSymbol, prodHost: 'https://bioindex.pankbase.org', devHost: 'https://bioindex.pankbase.org',
        documentationUrl: 'https://pankbase.org/cell-states-docs.html', exampleGenes: ['CFTR','PDX1','INS'], primaryColor: '#0f827d', secondaryColor: '#0f827d' },
    } })]);
  },
});
app.$mount('#app');
const origin = new URL(document.baseURI).origin;
window.addEventListener('message', async event => {
  if (event.origin !== origin || event.source !== window.parent || event.data?.protocol !== protocol || event.data.type !== 'context') return;
  const { moduleId, context } = event.data;
  if (!Object.prototype.hasOwnProperty.call(modules, moduleId) || context?.moduleId !== moduleId || context.available !== true) return;
  const token = ++app.serial;
  try {
    const module = await modules[moduleId]();
    if (token !== app.serial) return;
    app.context = context; app.moduleId = moduleId; app.component = module.default; app.error = '';
  } catch (error) {
    if (token === app.serial) app.error = 'The module could not load. Please retry.';
  }
});
window.parent.postMessage({ protocol, type: 'ready' }, origin);
