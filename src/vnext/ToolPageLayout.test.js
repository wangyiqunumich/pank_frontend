import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ToolPageLayout from './ToolPageLayout';
import { upsertRecentChat } from '../utils/chatSessionStorage';
jest.mock('react-oidc-context', () => ({useAuth:()=>({isAuthenticated:false})}));
function Location() {const l=useLocation();return <output data-testid="location">{l.pathname+l.search}</output>;}
function mount(content='Record selection') {return render(<MemoryRouter initialEntries={['/intermediate?relationship=QTL']}><ToolPageLayout><div>{content}</div><Location /></ToolPageLayout></MemoryRouter>);}
// jsdom does not apply desktop media queries; exercise responsive sidebar controls explicitly.
beforeEach(()=>{localStorage.clear();sessionStorage.clear();});
test('record selection keeps Tools active and both navigation actions usable',()=>{
  mount();expect(screen.getByRole('main').textContent).toContain('Record selection');
  expect(screen.getByRole('button',{hidden:true,name:'Tools'}).getAttribute('aria-current')).toBe('page');
  fireEvent.click(screen.getByRole('button',{hidden:true,name:'Tools'}));expect(screen.getByTestId('location').textContent).toBe('/skills');
  fireEvent.click(screen.getByRole('button',{hidden:true,name:'New Chat'}));expect(screen.getByTestId('location').textContent).toBe('/');
});
test('collapse persists across remount and collapsed buttons remain accessible',()=>{
  const view=mount();fireEvent.click(screen.getByRole('button',{hidden:true,name:'Collapse sidebar'}));
  expect(localStorage.getItem('pank-sidebar-open')).toBe('false');
  fireEvent.click(screen.getByRole('button',{hidden:true,name:'Tools'}));expect(screen.getByTestId('location').textContent).toBe('/skills');
  view.unmount();mount();expect(screen.getByRole('button',{hidden:true,name:'Expand sidebar'}).getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(screen.getByRole('button',{hidden:true,name:'Expand sidebar'}));expect(localStorage.getItem('pank-sidebar-open')).toBe('true');
});
test('recent chat updates are navigable and preserve the selected session',()=>{
  mount();act(()=>upsertRecentChat({sessionId:'session-1',firstQuestion:'CFTR in ductal cells?'}));
  fireEvent.click(screen.getByRole('button',{hidden:true,name:'CFTR in ductal cells?'}));
  const url=new URL(screen.getByTestId('location').textContent,'http://localhost');
  expect(url.pathname).toBe('/result-new2');expect(url.searchParams.get('session_id')).toBe('session-1');
  expect(atob(url.searchParams.get('question'))).toBe('CFTR in ductal cells?');
});
test.each(['Loading records','No matching records','Request failed'])('navigation remains available for %s',message=>{
  mount(message);expect(screen.getByRole('main').textContent).toContain(message);
  fireEvent.click(screen.getByRole('button',{hidden:true,name:'New Chat'}));expect(screen.getByTestId('location').textContent).toBe('/');
});
