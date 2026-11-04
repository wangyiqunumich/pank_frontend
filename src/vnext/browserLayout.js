// Shared host geometry. Embedded browsers own their toolbar and content padding.
export const BROWSER_VISUAL_IDS = new Set([
  'graph_viewer', 'single_cell_browser', 'genome_browser',
  'differential_expression', 'functional_browser', 'pca_explorer',
]);
export const BROWSER_PANEL_HEIGHT = 'clamp(600px, 72dvh, 800px)';
export const BROWSER_SURFACE_SX = {
  bgcolor: '#fff', borderColor: '#e2e8f0', borderRadius: '12px',
  p: 0, overflow: 'hidden', minWidth: 0, minHeight: 0,
  alignItems: 'stretch', justifyContent: 'stretch',
};
export const BROWSER_FILL_SX = {
  width: '100%', height: '100%', minWidth: 0, minHeight: 0,
  display: 'flex', flexDirection: 'column', bgcolor: '#fff',
};
export const BROWSER_HEADER_SX = {
  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1,
  px: 1.5, py: 1.5, borderBottom: '1px solid #f1f5f9',
  color: '#0f766e', flexShrink: 0,
  '& > p': { minWidth: 160 },
  '& > a': { marginLeft: 'auto', maxWidth: '100%' },
};
export const BROWSER_IFRAME_STYLE = {
  display: 'block', width: '100%', height: 0, minWidth: 0, minHeight: 0,
  border: 0, flex: '1 1 0%',
};
