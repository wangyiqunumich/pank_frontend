// Reuse the approved same-origin component API on the development host.
export const dataBase = () => new URL(new URL(document.baseURI).pathname.includes('/techdemo/') ? '../api/pankbase-data/v1/' : '/techdemo/api/pankbase-data/v1/', document.baseURI).href.replace(/\/$/, '');
export const assetUrl = path => `${dataBase()}/assets/${path}`;
