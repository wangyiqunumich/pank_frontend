import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GraphLegend from './GraphLegend';
import { legendSchema } from '../components/style';

test('legend keeps the heading and content mounted through rapid reversals', () => {
  render(<GraphLegend />);
  const toggle = screen.getByRole('button', { name: 'Expand legend' });
  const body = document.getElementById(toggle.getAttribute('aria-controls'));
  expect(body.getAttribute('aria-hidden')).toBe('true');
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Collapse legend', expanded: true })).toBe(toggle);
  expect(body.getAttribute('aria-hidden')).toBe('false');
  legendSchema.forEach(({ label }) => expect(screen.getByText(label)).toBeTruthy());
  fireEvent.click(toggle);
  fireEvent.click(toggle);
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Expand legend', expanded: false })).toBe(toggle);
  expect(body.isConnected).toBe(true);
  expect(body.getAttribute('aria-hidden')).toBe('true');
});

test('legend supports initially expanded graphs and exposes its controlled body', () => {
  render(<GraphLegend defaultOpen />);
  const toggle = screen.getByRole('button', { name: 'Collapse legend' });
  expect(document.getElementById(toggle.getAttribute('aria-controls'))).toBeTruthy();
  expect(screen.getByText('Core Nodes')).toBeTruthy();
  expect(screen.getByText('Neighbor')).toBeTruthy();
});
