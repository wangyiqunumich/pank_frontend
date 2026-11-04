import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import StatPage from './StatPage';
import data from '../statistics/statistics20261104.json';

test('snapshot totals reconcile and no private source records enter the public catalog', () => {
  expect(data.rows.filter(r => r.kind === 'nodes').reduce((n, r) => n + r.count, 0)).toBe(5454692);
  expect(data.rows.filter(r => r.kind === 'edges').reduce((n, r) => n + r.count, 0)).toBe(7262719);
  expect(data.rows.some(r => /ABC_PREDICTED_TARGET|Regulatory_element/.test(r.id))).toBe(false);
  expect(JSON.stringify(data)).not.toMatch(/mail\.google|\/db\/|\/nfs\/|\/Users\/|human-donors\/|authuser|token=|password/i);
  data.rows.forEach(row => {
    expect(row.licenses.length).toBeGreaterThan(0);
    row.library.forEach(link => expect(link.url).toMatch(/^https:\/\/data\.pankbase\.org\/(analysis-sets|curated-sets)\/PKBDS[A-Z0-9]+\/$/));
  });
});

test('researchers can search relationships, inspect terms and distinguish related downloads', () => {
  render(<StatPage />);
  expect(screen.getByRole('heading', { name: 'Statistics & data sources' })).toBeTruthy();
  expect(screen.getByRole('main').textContent).toContain('PanKgraph 11/04/2026 version');
  expect(screen.getByRole('main').textContent).not.toMatch(/\b1104\b|development build|development data build/i);
  fireEvent.click(screen.getByRole('button', { name: /Relationships/ }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'BioGRID' } });
  expect(screen.getByRole('status').textContent).toBe('2 of 34 relationship groups');
  expect(screen.getAllByRole('link', { name: /MIT/ }).length).toBe(2);
  fireEvent.click(screen.getByRole('checkbox', { name: 'With PanKbase links' }));
  expect(screen.getByText('No matching data types')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'GENE_ENRICHED_IN' } });
  const table = screen.getByRole('table');
  expect(within(table).getByText('Related resource')).toBeTruthy();
  expect(within(table).getByRole('link', { name: /PKBDS1349YHGQ/ }).getAttribute('href')).toBe('https://data.pankbase.org/analysis-sets/PKBDS1349YHGQ/');
  fireEvent.change(screen.getByLabelText('License status'), { target: { value: 'unknown' } });
  expect(screen.getByRole('status').textContent).toBe('0 of 34 relationship groups');
});
