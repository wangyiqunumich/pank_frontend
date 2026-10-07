import { initializeGtag, trackGtagEvent } from './gtag';

afterEach(() => {
  document.getElementById('pankgraph-ga4')?.remove();
  delete window.gtag;
  delete window.dataLayer;
});

test('development configures both tags with one loader and preserves interaction tracking', () => {
  const options = { stage: 'development' };
  initializeGtag(options);
  expect(document.getElementById('pankgraph-ga4').src).toBe('https://www.googletagmanager.com/gtag/js?id=G-BEWL9F8CW7');
  expect(window.dataLayer.map(command => Array.from(command)).slice(1)).toEqual([
    ['config', 'G-F1RRRLLMKP'], ['config', 'G-BEWL9F8CW7'],
  ]);
  trackGtagEvent('query_cancelled', { source: 'test' });
  expect(Array.from(window.dataLayer[3])).toEqual(['event', 'query_cancelled', { page_path: '/', source: 'test' }]);
  initializeGtag(options);
  expect(document.querySelectorAll('#pankgraph-ga4')).toHaveLength(1);
  expect(window.dataLayer).toHaveLength(4);
});

test.each(['production', ' PRODUCTION ', '', null])('stage %s leaves GA4 off', stage => {
  initializeGtag({ stage });
  trackGtagEvent('query_submitted');
  expect(document.getElementById('pankgraph-ga4')).toBeNull();
  expect(window.gtag).toBeUndefined();
  expect(window.dataLayer).toBeUndefined();
});

test('initialization reads only the existing site stage from build variables', () => {
  const originalStage = process.env.REACT_APP_API_GATEWAY_STAGE_NAME;
  try {
    process.env.REACT_APP_API_GATEWAY_STAGE_NAME = 'development';
    initializeGtag();
    expect(window.dataLayer.map(command => Array.from(command)).slice(1)).toEqual([
      ['config', 'G-F1RRRLLMKP'], ['config', 'G-BEWL9F8CW7'],
    ]);
  } finally {
    if (originalStage === undefined) delete process.env.REACT_APP_API_GATEWAY_STAGE_NAME;
    else process.env.REACT_APP_API_GATEWAY_STAGE_NAME = originalStage;
  }
});
