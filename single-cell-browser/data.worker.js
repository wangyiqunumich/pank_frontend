import { createLoader } from './data.mjs';
let load = createLoader();
self.onmessage = async ({ data }) => {
  try {
    if (data.refresh) { load = createLoader(undefined, undefined, true); }
    const result = await load(data.gene, atlas => self.postMessage({ request: data.request, phase: 'atlas', atlas }));
    self.postMessage({ request: data.request, phase: 'complete', result });
  } catch (error) { self.postMessage({ request: data.request, error: error.message || 'Atlas loading failed.' }); }
};
