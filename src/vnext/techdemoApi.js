import fixture from './techdemoFixture.json';
// A second explicit fixture starts without module-triggering graph evidence.
// It exercises guide-created modules without changing the original all-module demo.
export const guideFixture = {
  run:{...fixture.run,run_id:'33333333-3333-4333-8333-333333333333',session_id:'module-guide-demo',question:'Explore modules with the Module guide',plan:{original_question:'Open modules from chat',steps:[{}]}},
  result:{...fixture.result,result_id:'44444444-4444-4444-8444-444444444444',combined_query_result:{nodes:[],edges:[]},xy_json:{},resources_tabs:{},source:{},answer:'**Module guide exploration demo.**\n\nThis answer starts without biological graph evidence or module tabs. Open Module guide and ask to open or configure a module. Apply adds an independent exploration view; its data are not evidence for this answer.'}
};
// This fixed demonstration never schedules or reads an agent/backend result.
export function techdemoRequest(path, options = {}) {
  const route = path.split('?')[0];
  const method = options.method || 'GET';
  const selected = [fixture,guideFixture].find(item => route === `/agent/v2/runs/${item.run.run_id}` || route === `/results/${item.result.result_id}`);
  if (selected && route === `/agent/v2/runs/${selected.run.run_id}` && method === 'GET') return JSON.parse(JSON.stringify(selected.run));
  if (selected && route === `/results/${selected.result.result_id}` && method === 'GET') return JSON.parse(JSON.stringify(selected.result));
  if (route === '/results' && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    const requested=[fixture,guideFixture].find(item=>item.run.run_id===body.run_id);
    if (requested) return {result_id: requested.result.result_id};
  }
  if (route.endsWith('/interactions') && method === 'POST') return {status:'ignored_fixed_demo'};
  throw Object.assign(new Error('This fixed demo does not run agent queries.'), {status: 404});
}
