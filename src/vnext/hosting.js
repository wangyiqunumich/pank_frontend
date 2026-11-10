/* global globalThis */
// Explicit hosting prefixes; root builds retain their existing routes.
const buildBase = ['/pankgraph-vnext', '/pankgraph-vnext/techdemo', '/techdemo'].includes(process.env.PUBLIC_URL) ? process.env.PUBLIC_URL : '';
// Only the dedicated demo document opts into fixture mode. Result parameters
// and client-side navigation cannot opt an ordinary document into this profile.
const demoDocument = globalThis.document?.querySelector('meta[name="pankgraph-page"]')?.content === 'techdemo';
const demoPath = /^\/techdemo(?:\/|$)/.test(globalThis.location?.pathname || '');
export const UI_BASE_PATH = demoDocument && demoPath ? '/techdemo' : buildBase;
export const TECH_DEMO = UI_BASE_PATH.endsWith('/techdemo');
export const uiPath = (path = '/') => {
  if (/^(https?:|mailto:|#|data:)/.test(path) || path.startsWith('//')) return path;
  const absolute = path.startsWith('/') ? path : `/${path}`;
  if (!UI_BASE_PATH || absolute === UI_BASE_PATH || absolute.startsWith(`${UI_BASE_PATH}/`)) return absolute;
  return `${UI_BASE_PATH}${absolute}`;
};

export const DEV_MODULES = TECH_DEMO || ['dev.pankgraph.org', 'localhost', '127.0.0.1'].includes(globalThis.location?.hostname);
export const moduleApiPath = path => `${TECH_DEMO ? UI_BASE_PATH : '/techdemo'}/api${path}`;
