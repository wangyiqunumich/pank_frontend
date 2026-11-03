import { UI_BASE_PATH, TECH_DEMO, uiPath } from './hosting';
const DEFAULTS = Object.freeze({ vnextEnabled: false, colocEnabled: false, apiBase: TECH_DEMO ? `${UI_BASE_PATH}/api` : '/pankgraph-vnext/api' });
let config = DEFAULTS;
export const isDevHost = (hostname) => ['dev.pankgraph.org', 'localhost', '127.0.0.1'].includes(hostname) || (Boolean(UI_BASE_PATH) && hostname === 'jieliulab3.dcmb.med.umich.edu');
export const normalizeDevConfig = (value, hostname) => ({
  vnextEnabled: isDevHost(hostname) && value?.vnextEnabled === true,
  colocEnabled: isDevHost(hostname) && value?.colocEnabled === true,
  // Only this same-origin, authenticated namespace is supported by this release.
  apiBase: DEFAULTS.apiBase,
});
export const getDevConfig = () => config;
export async function loadDevConfig() {
  if (!isDevHost(window.location.hostname)) return config;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(uiPath('/pankgraph-dev-config.json'), { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
    if (response.ok && /application\/json/i.test(response.headers.get('content-type') || '')) config = normalizeDevConfig(await response.json(), window.location.hostname);
  } catch (_) { /* Missing or unavailable config leaves the legacy default intact. */ }
  finally { clearTimeout(timer); }
  return config;
}
