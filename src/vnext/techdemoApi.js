import fixture from './techdemoFixture.json';
// This fixed demonstration never schedules or reads an agent/backend result.
export function techdemoRequest(path, options = {}) {
  const route = path.split('?')[0];
  const method = options.method || 'GET';
  if (route === `/agent/v2/runs/${fixture.run.run_id}` && method === 'GET') return JSON.parse(JSON.stringify(fixture.run));
  if (route === `/results/${fixture.result.result_id}` && method === 'GET') return JSON.parse(JSON.stringify(fixture.result));
  if (route === '/results' && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    if (body.run_id === fixture.run.run_id) return {result_id: fixture.result.result_id};
  }
  if (route.endsWith('/interactions') && method === 'POST') return {status:'ignored_fixed_demo'};
  throw Object.assign(new Error('This fixed demo does not run agent queries.'), {status: 404});
}
