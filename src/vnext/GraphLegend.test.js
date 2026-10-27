import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GraphLegend from './GraphLegend';
import { legendSchema } from '../components/style';

test('legend keeps its target width until collapse ends, including rapid reversals', async () => {
  render(<GraphLegend />);
  const legend = screen.getByRole('complementary', { name: 'Graph legend' });
  expect(legend.className).not.toContain('is-wide');
  fireEvent.click(screen.getByRole('button', { name: 'Expand legend' }));
  expect(legend.className).toContain('is-wide');
  expect(screen.getByRole('button', { name: 'Collapse legend' }).getAttribute('aria-expanded')).toBe('true');
  legendSchema.forEach(({ label }) => expect(screen.getByText(label)).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Collapse legend' }));
  expect(legend.className).toContain('is-wide');
  fireEvent.click(screen.getByRole('button', { name: 'Expand legend' }));
  expect(legend.className).toContain('is-wide');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse legend' }));
  await waitFor(() => expect(legend.className).not.toContain('is-wide'));
});

test('legend supports initially expanded graphs and exposes its controlled body', () => {
  render(<GraphLegend defaultOpen />);
  const toggle = screen.getByRole('button', { name: 'Collapse legend' });
  expect(document.getElementById(toggle.getAttribute('aria-controls'))).toBeTruthy();
  expect(screen.getByText('Core Nodes')).toBeTruthy();
  expect(screen.getByText('Neighbor')).toBeTruthy();
});
