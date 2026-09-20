import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AgentPage from './AgentPage';
import AgentRoute, { shouldUseVnextForNewQuestion, shouldUseVnextAgent } from './AgentRoute';
import ConventionalRoute from './ConventionalRoute';
import { normalizeDevConfig, loadDevConfig, getDevConfig } from './runtimeConfig';
import { chatProvider, recentChatPath, readRecentChats, upsertRecentChat } from '../utils/chatSessionStorage';
jest.mock('../SearchResult/AgentResult', () => ({ AgentResultLayout: ({ResultView, showFloatingSearchBar}) => <section aria-label="Native result layout"><ResultView />{showFloatingSearchBar && <input aria-label="Native follow-up" />}</section> }));
jest.mock('./ResultView', () => ({__esModule:true, default:()=><div>New agent result</div>, ConventionalResultView:()=> <div>New tool result</div>}));
function RouteProbe() { const location = useLocation(); return <output data-testid="route">{location.pathname}{location.search}</output>; }
function mount(path) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/" element={<div>Original PanKgraph landing</div>} />
    <Route path="/agent-vnext" element={<AgentPage />} />
    <Route path="/result-new2" element={<AgentRoute><div>Legacy agent result</div></AgentRoute>} />
    <Route path="/result-new" element={<ConventionalRoute><div>Legacy tool result</div></ConventionalRoute>} />
  </Routes><RouteProbe /></MemoryRouter>);
}
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });
async function enable(value) {
  global.fetch = jest.fn().mockResolvedValue({ok:true,headers:{get:()=> 'application/json'},json:async()=>({vnextEnabled:value})});
  await loadDevConfig();
}

test('only dev boolean enables new requests while unversioned sessions retain their reader', () => {
  expect(normalizeDevConfig({}, 'dev.pankgraph.org').vnextEnabled).toBe(false);
  expect(normalizeDevConfig({vnextEnabled:'true'}, 'dev.pankgraph.org').vnextEnabled).toBe(false);
  expect(normalizeDevConfig({vnextEnabled:true,apiBase:'https://attacker.test'}, 'pankgraph.org')).toEqual({vnextEnabled:false,apiBase:'/pankgraph-vnext/api'});
  expect(normalizeDevConfig({vnextEnabled:true}, 'dev.pankgraph.org').vnextEnabled).toBe(true);
  expect(shouldUseVnextForNewQuestion('?question=INS', false)).toBe(false);
  expect(shouldUseVnextForNewQuestion('?question=INS', true)).toBe(true);
  expect(shouldUseVnextAgent('?question=INS&session_id=old', true)).toBe(false);
  expect(shouldUseVnextAgent('?provider=vnext&session_id=new', false)).toBe(true);
  expect(shouldUseVnextAgent('?run_id=saved', false)).toBe(true);
});
test('unavailable config keeps legacy default at startup', async () => {
  await enable(false);
  global.fetch = jest.fn().mockRejectedValue(new TypeError('offline'));
  await loadDevConfig();
  expect(getDevConfig().vnextEnabled).toBe(false);
});
test('new questions render in the native result URL and shell', async () => {
  await enable(true);
  mount('/result-new2?question=SU5T');
  expect(await screen.findByText('New agent result')).toBeTruthy();
  expect(screen.getByRole('region', {name:'Native result layout'})).toBeTruthy();
  expect(screen.getByLabelText('Native follow-up')).toBeTruthy();
  expect(screen.getByTestId('route').textContent).toMatch(/^\/result-new2\?question=SU5T&intent=/);
  expect(screen.queryByText('Agent preview')).toBeNull();
});
test('old sessions retain their original reader after dev replacement', async () => {
  await enable(true);
  mount('/result-new2?question=SU5T&session_id=old');
  expect(screen.getByText('Legacy agent result')).toBeTruthy();
  expect(screen.queryByText('New agent result')).toBeNull();
});
test('rollback preserves v2 saved readers while new questions use the legacy handler', async () => {
  await enable(false);
  const first = mount('/result-new2?provider=vnext&session_id=new');
  expect(screen.getByText('New agent result')).toBeTruthy(); first.unmount();
  mount('/result-new2?question=SU5T');
  expect(screen.getByText('Legacy agent result')).toBeTruthy();
});
test('existing agent bookmark opens original landing without another login or API access check', async () => {
  await enable(true); global.fetch.mockClear();
  mount('/agent-vnext');
  expect(await screen.findByText('Original PanKgraph landing')).toBeTruthy();
  expect(screen.getByTestId('route').textContent).toBe('/');
  expect(global.fetch).not.toHaveBeenCalled();
});
test('existing saved bookmark aliases to the native URL without losing its identity', async () => {
  await enable(false); global.fetch.mockClear();
  mount('/agent-vnext?run_id=saved&session_id=session');
  expect(await screen.findByText('New agent result')).toBeTruthy();
  expect(screen.getByTestId('route').textContent).toBe('/result-new2?run_id=saved&session_id=session&provider=vnext');
  expect(global.fetch).not.toHaveBeenCalled();
});
test('native conventional result switches only with dev config', async () => {
  await enable(true);
  const first = mount('/result-new?sourceTerm=snp@rs1&relationship=GWAS&targetTerm=disease');
  expect(screen.getByText('New tool result')).toBeTruthy(); first.unmount();
  await enable(false);
  mount('/result-new?sourceTerm=snp@rs1&relationship=GWAS&targetTerm=disease');
  expect(screen.getByText('Legacy tool result')).toBeTruthy();
});
test('history keeps old and v2 session identities distinct with native deep links', () => {
  localStorage.setItem('pank_recent_conversations_v1', JSON.stringify([{sessionId:'shared',firstQuestion:'旧问题',custom:'preserve'}]));
  upsertRecentChat({sessionId:'shared',firstQuestion:'New question',provider:'vnext',version:2});
  upsertRecentChat({sessionId:'shared',firstQuestion:'Legacy update'});
  const entries = readRecentChats();
  expect(entries).toHaveLength(2);
  const legacy = entries.find(x=>chatProvider(x)==='legacy');
  const vnext = entries.find(x=>chatProvider(x)==='vnext');
  expect(legacy.custom).toBe('preserve');
  expect(legacy.firstQuestion).toBe('旧问题');
  expect(recentChatPath(legacy)).toMatch(/^\/result-new2\?question=.+&session_id=shared$/);
  expect(recentChatPath(vnext)).toBe('/result-new2?provider=vnext&session_id=shared');
  expect(chatProvider({provider:'vnext',version:999})).toBe('legacy');
});

test('explicit conventional identities remain readable after rollout rollback', async () => {
  await enable(false);
  mount('/result-new?provider=vnext&result_id=saved-result');
  expect(screen.getByText('New tool result')).toBeTruthy();
  expect(screen.queryByText('Legacy tool result')).toBeNull();
});
