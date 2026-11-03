// Same-origin, immutable data snapshot hosted by the PanKgraph data service.
export const dataBase = () => new URL('../api/pankbase-data/v1/', document.baseURI).href.replace(/\/$/, '');
export const assetUrl = path => `${dataBase()}/assets/${path}`;
