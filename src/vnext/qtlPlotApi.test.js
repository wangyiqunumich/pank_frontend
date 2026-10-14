import { loadQtlPlot } from './qtlPlotApi';
import { QTL_CONFIG } from './qtlContext';
const context = key => ({ key: `1_sQTL-gtex-susie/${key}`, available: true });
afterEach(() => { delete global.fetch; });
test('uses the production contract, accepts plain base64 and caches the exact source/set', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'iVBORw0KGgo=' });
  const value = context('set1');
  expect(await loadQtlPlot(value)).toBe('data:image/png;base64,iVBORw0KGgo=');
  await loadQtlPlot(value);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe(QTL_CONFIG.request.endpoint);
  expect(url).toContain('/production/typeToImage');
  expect(options.credentials).toBe('omit');
  expect(JSON.parse(options.body)).toEqual({ imageType: 'manhattan', link: value.key });
});
test('accepts JSON encoded base64 but rejects arbitrary URLs and removes failed cache entries', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify('/9j/AAAA') })
    .mockResolvedValueOnce({ ok: true, text: async () => 'https://example.org/plot.png' })
    .mockResolvedValueOnce({ ok: true, text: async () => 'iVBORw0KGgo=' });
  expect(await loadQtlPlot(context('set2'))).toContain('image/jpeg');
  await expect(loadQtlPlot(context('set3'))).rejects.toThrow('Invalid production plot');
  expect(await loadQtlPlot(context('set3'))).toContain('image/png');
  await expect(loadQtlPlot({ available: false })).rejects.toThrow('Unavailable');
});
