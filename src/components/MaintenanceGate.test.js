import React from 'react';
import { render, screen } from '@testing-library/react';
import MaintenanceGate from './MaintenanceGate';

afterEach(() => window.history.replaceState({}, '', '/'));

test.each([
  '/', '/result-new2?question=example', '/docs/KG_API', '/skills',
  '/review/T1D_mechanism', '/callback?code=example', '/unknown/nested/path',
])('maintenance covers %s without mounting the normal application', path => {
  window.history.replaceState({}, '', path);
  const mountApplication = jest.fn();
  function NormalApplication() { mountApplication(); return <div>Normal application</div>; }
  render(<MaintenanceGate><NormalApplication /></MaintenanceGate>);
  expect(screen.getByRole('heading', { name: 'PanKgraph is under maintenance.' })).toBeTruthy();
  expect(screen.getByText(/We.ll be back before/).textContent).toContain('October 14');
  expect(document.querySelector('time').getAttribute('datetime')).toBe('2026-10-14');
  expect(mountApplication).not.toHaveBeenCalled();
  expect(document.title).toBe('Maintenance | PanKgraph');
});

test('turning maintenance off restores the application and its page metadata', () => {
  document.title = 'PanKgraph';
  const robots = document.createElement('meta');
  robots.name = 'robots'; robots.content = 'index,follow'; document.head.appendChild(robots);
  try {
    const { rerender } = render(<MaintenanceGate enabled><div>Normal application</div></MaintenanceGate>);
    expect(robots.content).toBe('noindex, nofollow');
    rerender(<MaintenanceGate enabled={false}><div>Normal application</div></MaintenanceGate>);
    expect(screen.getByText('Normal application')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /under maintenance/ })).toBeNull();
    expect(document.title).toBe('PanKgraph');
    expect(robots.content).toBe('index,follow');
  } finally { robots.remove(); }
});
