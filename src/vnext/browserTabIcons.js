import map from './assets/browser/sc-map-tab.svg';
import expression from './assets/browser/sc-expression-tab.svg';
import source from './assets/browser/sc-source-tab.svg';

// The browser views share the scBrowser icon size and teal stroke.
const icon = paths => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#0f766e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`)}`;
const chart = icon('<path d="M2 2v10h10M4 8l2-3 2 2 3-4"/>');
const table = icon('<rect x="1.5" y="2" width="11" height="10" rx="1.5"/><path d="M2 5h10M2 8.5h10M6 5v7"/>');
const heatmap = icon('<rect x="1.5" y="1.5" width="11" height="11" rx="1.5"/><path d="M5 2v10M9 2v10M2 5h10M2 9h10"/>');
const tracks = icon('<path d="M2 3h10M2 7h10M2 11h10M4 1.5v3M9 5.5v3M6 9.5v3"/>');
const icons = {
  'Cell map': map, 'PCA map': map, Volcano: map,
  Expression: expression, Response: chart, Manhattan: chart,
  Genome: tracks, Tracks: tracks, Heatmap: heatmap,
  'Gene table': table, Contributions: chart, Source: source,
};
export const browserTabIcon = view => icons[view] || chart;
