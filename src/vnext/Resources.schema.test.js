import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useResourcePanels } from './Resources';

function Panels({ resources, options, status }) {
  const panels = useResourcePanels(resources, status, options);
  return <>{panels.tabs.map((tab) => <section key={tab.label} aria-label={tab.label}>{tab.content || tab.items.map((item) => <div key={item.id}>{item.title}</div>)}</section>)}{panels.popup}</>;
}

const references = { first: { id: 'first', title: 'Recorded paper', pmid: '12345678' } };

test('supporting tabs honor schema order and labels while the default adapter keeps legacy ordering', () => {
  const resources = { references, pankbase_links: [['Portal record', 'https://pankbase.org/record']], external_links: [['Source record', 'Source', 'https://example.org/record']] };
  const { rerender } = render(<Panels resources={resources} />);
  expect(screen.getAllByRole('region').map((item) => item.getAttribute('aria-label'))).toEqual(['References', 'Pankbase Links', 'External Links']);
  rerender(<Panels resources={resources} options={{ tabs: [{ id: 'external_links', label: 'External sources' }, { id: 'references', label: 'References' }] }} />);
  expect(screen.getAllByRole('region').map((item) => item.getAttribute('aria-label'))).toEqual(['External sources', 'References']);
  expect(screen.queryByText('Portal record')).toBeNull();
});

test('independent empirical groups render once each and expand their own image', () => {
  const first = { id: 'association-1', title: 'First association', image_url: '/api/resources/one.png', description: 'First recorded context.' };
  const second = { id: 'association-2', title: 'Second association', image_url: '/api/resources/two.png', description: 'Second recorded context.' };
  const { rerender } = render(<Panels resources={{ empirical_evidence: first, empirical_evidence_groups: [first, second] }} />);
  expect(screen.getAllByText('First association')).toHaveLength(1);
  expect(screen.getAllByText('Second association')).toHaveLength(1);
  expect(screen.getAllByAltText('Empirical Evidence')).toHaveLength(2);
  fireEvent.click(screen.getAllByAltText('Empirical Evidence')[1]);
  expect(screen.getAllByAltText('Empirical Evidence').map((item) => item.getAttribute('src'))).toEqual([
    '/pankgraph-vnext/api/resources/one.png', '/pankgraph-vnext/api/resources/two.png', '/pankgraph-vnext/api/resources/two.png',
  ]);
  // A popup from a replaced resource context must not survive on the next result.
  rerender(<Panels resources={{ empirical_evidence: first }} />);
  expect(screen.getAllByAltText('Empirical Evidence')).toHaveLength(1);
});

test('schema-selected partial-resource notices stay visible without a fabricated image', () => {
  render(<Panels resources={{}} status="unavailable" options={{ tabs: [{ id: 'empirical_evidence', label: 'Empirical Evidence' }] }} />);
  expect(screen.getByText('Supplementary resources unavailable')).toBeTruthy();
  expect(screen.queryAllByAltText('Empirical Evidence')).toHaveLength(0);
});

test('unavailable resources never render a download action without a real target', () => {
  render(<Panels resources={{ empirical_evidence: { status: 'unavailable', title: 'Source unavailable', link_text: 'Download source data' } }} />);
  expect(screen.queryByRole('link', { name: 'Download source data' })).toBeNull();
});
