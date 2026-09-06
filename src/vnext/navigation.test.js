import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../Footer/footer';

test('rendered footer keeps both internal home links inside the isolated prefix', () => {
  render(<Footer />);
  expect(screen.getByRole('link', { name: 'PanKbase Logo' }).getAttribute('href')).toBe('/pankgraph-vnext/old-landing');
  expect(screen.getByRole('link', { name: 'PanKgraph' }).getAttribute('href')).toBe('/pankgraph-vnext/');
  expect(screen.getByRole('link', { name: 'Hirn Logo' }).getAttribute('href')).toBe('https://hirnetwork.org/');
});
