import { recordInteraction, referenceKey, telemetryStatus } from './telemetry';
import { request } from './api';
jest.mock('./api', () => ({ request: jest.fn() }));

beforeAll(() => { Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'e1b384c0-1173-4d37-a5cc-cb52f861e536' } }); });

test('rerender observations deduplicate without changing a query or exposing URLs', async () => {
  request.mockResolvedValue({ status: 'recorded' });
  const target = referenceKey('https://example.org/source?private=discard');
  await recordInteraction('run-a', 'resource_accessed', target);
  await recordInteraction('run-a', 'resource_accessed', target);
  expect(request).toHaveBeenCalledTimes(1);
  const payload = JSON.parse(request.mock.calls[0][1].body);
  expect(payload.target_id).toMatch(/^ref-[a-f0-9]+$/);
  expect(JSON.stringify(payload)).not.toMatch(/private|example|source\?/);
  expect(payload.client_elapsed_ms).toBeGreaterThanOrEqual(0);
  expect(payload.actor_source).toBe('user');
});

test('audit observations explicitly identify their source', async () => {
  request.mockResolvedValue({ status: 'recorded' });
  sessionStorage.setItem('pank-vnext:actor-source', 'audit_replay');
  await recordInteraction('audit-run', 'plan_displayed', 'p1');
  expect(JSON.parse(request.mock.calls.at(-1)[1].body).actor_source).toBe('audit_replay');
  sessionStorage.removeItem('pank-vnext:actor-source');
});

test('telemetry failure is observable and does not reject the user operation', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  request.mockRejectedValue(new Error('never log this secret'));
  expect(await recordInteraction('run-b', 'plan_displayed', 'plan')).toBe(false);
  expect(telemetryStatus().failed).toBe(1);
  expect(warn).toHaveBeenCalledWith('[PanKgraph] UX observation unavailable.');
  warn.mockRestore();
});
