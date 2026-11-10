describe('isolated techdemo hosting', () => {
  const original = process.env.PUBLIC_URL;
  afterEach(() => { process.env.PUBLIC_URL = original; jest.resetModules(); });
  test('all demo resources use the dedicated same-origin prefix', () => {
    process.env.PUBLIC_URL = '/techdemo'; jest.resetModules();
    const { sitePath, apiPath } = require('./api');
    const { isDevHost } = require('./runtimeConfig');
    expect(sitePath('/scbrowser/embed.json')).toBe('/techdemo/scbrowser/embed.json');
    expect(sitePath('/api/pankbase-data/v1/expression')).toBe('/techdemo/api/pankbase-data/v1/expression');
    expect(apiPath('/results')).toBe('/techdemo/api/results');
    expect(isDevHost('jieliulab3.dcmb.med.umich.edu')).toBe(true);
    expect(isDevHost('pankgraph.org')).toBe(false);
  });
  test('root build retains existing API and asset routes', () => {
    process.env.PUBLIC_URL = ''; jest.resetModules();
    const { sitePath, apiPath } = require('./api');
    expect(sitePath('/scbrowser/embed.json')).toBe('/scbrowser/embed.json');
    expect(apiPath('/results')).toBe('/pankgraph-vnext/api/results');
  });
});

test('demo selection requires both the dedicated document and its path', () => {
  const marker = document.createElement('meta');
  marker.name = 'pankgraph-page';
  marker.content = 'techdemo';
  const originalUrl = window.location.href;
  try {
    document.head.append(marker);
    window.history.replaceState({}, '', '/result-new2?profile=techdemo');
    jest.resetModules();
    expect(require('./hosting').TECH_DEMO).toBe(false);
    window.history.replaceState({}, '', '/techdemo/result-new2');
    jest.resetModules();
    expect(require('./hosting').TECH_DEMO).toBe(true);
    marker.remove();
    jest.resetModules();
    expect(require('./hosting').TECH_DEMO).toBe(false);
  } finally {
    marker.remove();
    window.history.replaceState({}, '', originalUrl);
    jest.resetModules();
  }
});
