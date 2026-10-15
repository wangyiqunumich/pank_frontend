import { createLoader } from './data.mjs';
import { SC_CONFIG } from '../src/vnext/scBrowserConfig.js';
const config = SC_CONFIG.full_view.expression_cache;
let load = createLoader(undefined,undefined,false,config);
self.onmessage = async ({ data }) => {
  try {
    if (data.refresh) { load = createLoader(undefined, undefined, true,config); }
    if (data.preview) { if (config.prefetch_default_gene) load.prefetch(data.gene).catch(() => {}); const atlas = await load.atlas(); self.postMessage({ request: data.request, phase: 'complete', result: { atlas, expression: null, stats: [] } }); return; }
    const result = await load(data.gene, atlas => self.postMessage({ request: data.request, phase: 'atlas', atlas }));
    self.postMessage({ request: data.request, phase: 'complete', result });
  } catch (error) { self.postMessage({ request: data.request, error: error.message || 'Atlas loading failed.' }); }
};
