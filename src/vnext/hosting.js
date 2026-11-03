// Explicit hosting prefixes; root builds retain their existing routes.
export const UI_BASE_PATH = ['/pankgraph-vnext', '/pankgraph-vnext/techdemo'].includes(process.env.PUBLIC_URL) ? process.env.PUBLIC_URL : '';
export const TECH_DEMO = UI_BASE_PATH === '/pankgraph-vnext/techdemo';
export const uiPath = (path = '/') => {
  if (/^(https?:|mailto:|#|data:)/.test(path) || path.startsWith('//')) return path;
  const absolute = path.startsWith('/') ? path : `/${path}`;
  if (!UI_BASE_PATH || absolute === UI_BASE_PATH || absolute.startsWith(`${UI_BASE_PATH}/`)) return absolute;
  return `${UI_BASE_PATH}${absolute}`;
};
