import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AgentPage, { accessLink, savedAccessReturn } from './AgentPage';
import { normalizeDevConfig, loadDevConfig, getDevConfig } from './runtimeConfig';
import { useVnextForNewQuestion } from './AgentRoute';
import { chatProvider, recentChatPath, readRecentChats, upsertRecentChat } from '../utils/chatSessionStorage';
import { request } from './api';
jest.mock('./api', () => ({ request: jest.fn() }));
jest.mock('../components/AgentSidebar', () => () => <div>Existing sidebar</div>);
jest.mock('./ResultView', () => () => <div>Saved investigation</div>);
function RouteProbe() { const location = useLocation(); return <output data-testid="route">{location.pathname}{location.search}</output>; }
const mount = (path = '/agent-vnext') => render(<MemoryRouter initialEntries={[path]}><AgentPage /><RouteProbe /></MemoryRouter>);
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });

test('only explicit dev boolean enables new-question routing, never legacy sessions', () => {
  expect(normalizeDevConfig({}, 'dev.pankgraph.org').vnextEnabled).toBe(false);
  expect(normalizeDevConfig({vnextEnabled:'true'}, 'dev.pankgraph.org').vnextEnabled).toBe(false);
  expect(normalizeDevConfig({vnextEnabled:true,apiBase:'https://attacker.test'}, 'pankgraph.org')).toEqual({vnextEnabled:false,apiBase:'/pankgraph-vnext/api'});
  expect(normalizeDevConfig({vnextEnabled:true}, 'dev.pankgraph.org').vnextEnabled).toBe(true);
  expect(useVnextForNewQuestion('?question=INS', false)).toBe(false);
  expect(useVnextForNewQuestion('?question=INS', true)).toBe(true);
  expect(useVnextForNewQuestion('?question=INS&session_id=old', true)).toBe(false);
});
test('missing runtime config leaves the legacy default enabled', async () => {
  global.fetch = jest.fn().mockRejectedValue(new TypeError('offline'));
  await loadDevConfig();
  expect(getDevConfig().vnextEnabled).toBe(false);
});
test('history keeps unversioned legacy entries and colliding v2 session identities separate', () => {
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
  expect(recentChatPath(vnext)).toBe('/agent-vnext?session_id=shared');
  expect(chatProvider({provider:'vnext',version:999})).toBe('legacy');
});
test('401 offers top-level Basic login without mounting or creating an investigation', async () => {
  request.mockRejectedValue(Object.assign(new Error('Unauthorized'), {status:401}));
  mount('/agent-vnext?run_id=saved');
  const signIn = await screen.findByRole('link',{name:'Sign in to preview'});
  await screen.findByText('Sign in with your preview access to open the new agent.');
  expect(signIn.getAttribute('href')).toBe(accessLink);
  expect(screen.queryByText('Saved investigation')).toBeNull();
  signIn.addEventListener('click', (event) => event.preventDefault());
  fireEvent.click(signIn);
  expect(sessionStorage.getItem('pank-vnext:access-return')).toBe('/agent-vnext?run_id=saved');
  expect(request.mock.calls.map(([path])=>path)).toEqual(['/access']);
});
test('pending access check always offers top-level sign-in and preserves the requested investigation', () => {
  request.mockReturnValue(new Promise(() => {}));
  mount('/agent-vnext?question=SU5T&intent=pending');
  expect(screen.getByRole('progressbar', {name:'Checking preview access'})).toBeTruthy();
  const signIn = screen.getByRole('link', {name:'Sign in to preview'});
  expect(signIn.getAttribute('href')).toBe(accessLink);
  signIn.addEventListener('click', event => event.preventDefault());
  fireEvent.click(signIn);
  expect(sessionStorage.getItem('pank-vnext:access-return')).toBe('/agent-vnext?question=SU5T&intent=pending');
  expect(screen.queryByText('Saved investigation')).toBeNull();
  expect(request.mock.calls.map(([path])=>path)).toEqual(['/access']);
});
test('access timeout keeps sign-in available with access-specific recovery text', async () => {
  request.mockRejectedValue(Object.assign(new Error('Reading the saved result timed out.'), {status:408}));
  mount('/agent-vnext?run_id=saved');
  await screen.findByText('Checking preview access timed out. Sign in to preview or refresh access.');
  expect(screen.queryByText('Reading the saved result timed out.')).toBeNull();
  const signIn = screen.getByRole('link', {name:'Sign in to preview'});
  signIn.addEventListener('click', event => event.preventDefault());
  fireEvent.click(signIn);
  expect(sessionStorage.getItem('pank-vnext:access-return')).toBe('/agent-vnext?run_id=saved');
  expect(screen.getByRole('button', {name:'Refresh access'})).toBeTruthy();
  expect(screen.queryByText('Saved investigation')).toBeNull();
});
test('sign-in return state is constrained before it is saved', () => {
  request.mockReturnValue(new Promise(() => {}));
  mount('/agent-vnext-evil?run_id=saved');
  const signIn = screen.getByRole('link', {name:'Sign in to preview'});
  signIn.addEventListener('click', event => event.preventDefault());
  fireEvent.click(signIn);
  expect(sessionStorage.getItem('pank-vnext:access-return')).toBe('/agent-vnext');
});
test('authenticated bootstrap restores the saved run URL and consumes return state', async () => {
  request.mockResolvedValue({authenticated:true});
  sessionStorage.setItem('pank-vnext:access-return','/agent-vnext?run_id=saved');
  mount();
  await waitFor(()=>expect(screen.getByTestId('route').textContent).toBe('/agent-vnext?run_id=saved'));
  expect(sessionStorage.getItem('pank-vnext:access-return')).toBeNull();
  expect(await screen.findByText('Saved investigation')).toBeTruthy();
});
test('failed access can be refreshed, and no question is sent before user submission', async () => {
  request.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({authenticated:true});
  mount();
  await screen.findByText('Offline');
  expect(screen.getByRole('link', {name:'Sign in to preview'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Refresh access'}));
  const question = await screen.findByLabelText('Your question');
  expect(screen.queryByRole('link', {name:'Sign in to preview'})).toBeNull();
  expect(screen.queryByText('Saved investigation')).toBeNull();
  fireEvent.change(question,{target:{value:'Which cells express INS?'}});
  fireEvent.click(screen.getByRole('button',{name:'Review plan'}));
  await waitFor(()=>expect(screen.getByTestId('route').textContent).toMatch(/^\/agent-vnext\?question=/));
  expect(request.mock.calls.every(([path])=>path==='/access')).toBe(true);
});
test('auth return values never leave the exact new-agent route', () => {
  expect(savedAccessReturn('//attacker.test')).toBeNull();
  expect(savedAccessReturn('/agent-vnext-evil?x=1')).toBeNull();
  expect(savedAccessReturn('/agent-vnext?run_id=r1')).toBe('/agent-vnext?run_id=r1');
});
