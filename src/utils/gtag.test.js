import { initializeGtag, trackGtagEvent } from './gtag';

afterEach(() => {
  document.getElementById('pankgraph-ga4')?.remove();
  delete window.gtag;
  delete window.dataLayer;
});

test('development loads only the replacement tag and preserves interaction tracking', () => {
  const options = { stage: 'development', measurementId: 'G-BEWL9F8CW7' };
  initializeGtag(options);
  expect(document.getElementById('pankgraph-ga4').src).toBe('https://www.googletagmanager.com/gtag/js?id=G-BEWL9F8CW7');
  expect(window.dataLayer.map(command => Array.from(command)).slice(1)).toEqual([['config', 'G-BEWL9F8CW7']]);
  trackGtagEvent('query_cancelled', { source: 'test' });
  expect(Array.from(window.dataLayer[2])).toEqual(['event', 'query_cancelled', { page_path: '/', source: 'test' }]);
  initializeGtag(options);
  expect(document.querySelectorAll('#pankgraph-ga4')).toHaveLength(1);
  expect(window.dataLayer).toHaveLength(3);
});

test.each(['production', ' PRODUCTION ', '', null])('stage %s leaves GA4 off even with a valid ID', stage => {
  initializeGtag({ stage, measurementId: 'G-BEWL9F8CW7' });
  trackGtagEvent('query_submitted');
  expect(document.getElementById('pankgraph-ga4')).toBeNull();
  expect(window.gtag).toBeUndefined();
  expect(window.dataLayer).toBeUndefined();
});

test.each(['disabled', ' DISABLED ', '', 'invalid', null])('development measurement value %s leaves GA4 off', measurementId => {
  initializeGtag({ stage: 'development', measurementId });
  trackGtagEvent('query_submitted');
  expect(document.getElementById('pankgraph-ga4')).toBeNull();
  expect(window.gtag).toBeUndefined();
  expect(window.dataLayer).toBeUndefined();
});

test('initialization reads the existing site stage and the measurement ID from build variables', () => {
  const originalStage = process.env.REACT_APP_API_GATEWAY_STAGE_NAME;
  const originalId = process.env.REACT_APP_GA4_MEASUREMENT_ID;
  try {
    process.env.REACT_APP_API_GATEWAY_STAGE_NAME = 'development';
    process.env.REACT_APP_GA4_MEASUREMENT_ID = 'G-BEWL9F8CW7';
    initializeGtag();
    expect(window.dataLayer.map(command => Array.from(command)).slice(1)).toEqual([['config', 'G-BEWL9F8CW7']]);
  } finally {
    if (originalStage === undefined) delete process.env.REACT_APP_API_GATEWAY_STAGE_NAME;
    else process.env.REACT_APP_API_GATEWAY_STAGE_NAME = originalStage;
    if (originalId === undefined) delete process.env.REACT_APP_GA4_MEASUREMENT_ID;
    else process.env.REACT_APP_GA4_MEASUREMENT_ID = originalId;
  }
});
