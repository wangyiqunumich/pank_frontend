import { techdemoRequest } from './techdemoApi';
import fixture from './techdemoFixture.json';

test('fixed run and result are returned locally without fetch', () => {
  global.fetch = jest.fn(() => { throw new Error('Unexpected network call'); });
  expect(techdemoRequest(`/agent/v2/runs/${fixture.run.run_id}`).run_id).toBe(fixture.run.run_id);
  expect(techdemoRequest('/results', {method:'POST', body:JSON.stringify({run_id:fixture.run.run_id})})).toEqual({result_id:fixture.result.result_id});
  expect(techdemoRequest(`/results/${fixture.result.result_id}`).result_id).toBe(fixture.result.result_id);
  expect(global.fetch).not.toHaveBeenCalled();
});
test('agent execution and unrelated results remain unavailable', () => {
  expect(() => techdemoRequest('/agent/v2/plans', {method:'POST'})).toThrow('fixed demo');
  expect(() => techdemoRequest('/results/another')).toThrow('fixed demo');
});
