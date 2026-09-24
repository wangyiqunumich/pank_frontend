import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AgentSidebar from '../components/AgentSidebar';
jest.mock('react-oidc-context', () => ({useAuth:()=>({isAuthenticated:false,signinRedirect:jest.fn(),removeUser:jest.fn()})}));
test('the actual sidebar and recent-chat hooks survive denied browser storage', () => {
  const local = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const session = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
  Object.defineProperty(window, 'localStorage', { configurable:true, get:()=>{throw new DOMException('Denied','SecurityError');} });
  Object.defineProperty(window, 'sessionStorage', { configurable:true, get:()=>{throw new DOMException('Denied','SecurityError');} });
  try {
    const { unmount } = render(<MemoryRouter><AgentSidebar /></MemoryRouter>);
    expect(screen.getByText('New Chat')).toBeTruthy();
    unmount();
  } finally {
    Object.defineProperty(window, 'localStorage', local);
    Object.defineProperty(window, 'sessionStorage', session);
  }
});
