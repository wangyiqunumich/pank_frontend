import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExternalLinksPanel from './ExternalLinksPanel';
import { normalizeExternalLinks } from './externalLinks';
import { resolveResultPage } from './resultPageSchema';
const url = id => `https://www.kegg.jp/pathway/${id}`;
const node = (id, name, sourceUrl = url(id)) => ({ id, labels: ['Pathway'], properties: { name, data_source_url: sourceUrl } });
const legacy = { external_links: Array.from({ length: 70 }, (_, i) => ['KEGG', 'Database source supplied by graph evidence', url(i)]) };
const evidence = { nodes: Array.from({ length: 70 }, (_, i) => node(String(i), `Pathway ${String(i).padStart(2, '0')}`)) };

test('70 legacy links become one collapsed source with names, pagination, and every URL reachable', () => {
  const groups = normalizeExternalLinks(legacy, evidence);
  render(<ExternalLinksPanel groups={groups} />);
  const header = screen.getByRole('button', { name: /KEGG 70 links/ });
  expect(header.getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByText('Pathway 00, Pathway 01, Pathway 02, …')).toBeTruthy();
  expect(screen.queryAllByRole('link')).toHaveLength(0);
  fireEvent.click(header);
  expect(screen.getAllByRole('link')).toHaveLength(10);
  fireEvent.click(screen.getByRole('button', { name: 'Show all 70 links' }));
  expect(new Set(screen.getAllByRole('link').map(link => link.href))).toEqual(new Set(legacy.external_links.map(link => link[2])));
  fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
  expect(screen.getAllByRole('link')).toHaveLength(10);
});

test('search includes identifiers, opens matching groups and restores expansion when cleared', async () => {
  render(<ExternalLinksPanel groups={normalizeExternalLinks(legacy, evidence)} />);
  const search = screen.getByRole('textbox', { name: 'Search sources or node names' });
  fireEvent.change(search, { target: { value: '69' } });
  expect(screen.getByRole('status').textContent).toBe('1 / 70 links match');
  expect(screen.getAllByRole('link')).toHaveLength(1);
  fireEvent.change(search, { target: { value: 'absent' } });
  expect(screen.getByText('No matching links.')).toBeTruthy();
  fireEvent.change(search, { target: { value: '' } });
  expect(screen.getByRole('button', { name: /KEGG 70 links/ }).getAttribute('aria-expanded')).toBe('false');
  await waitFor(() => expect(screen.queryAllByRole('link')).toHaveLength(0));
});

test('shared URLs retain all node contexts; edge labels use endpoints and relationship', () => {
  const graph = { nodes: [node('A', 'Alpha', url('shared')), node('B', 'Beta', url('shared'))],
    edges: [{ id: 'edge', source: 'A', target: 'B', type: 'REGULATES', properties: { data_source_url: url('edge') } }] };
  const groups = normalizeExternalLinks({ external_links: [['KEGG', 'generic', url('shared')], ['kegg', 'generic', url('shared')], ['KEGG', 'generic', url('edge')]] }, graph);
  expect(groups).toHaveLength(1);
  expect(groups[0].entries).toHaveLength(2);
  expect(groups[0].entries.find(entry => entry.url === url('shared')).entities.map(e => e.name)).toEqual(['Alpha', 'Beta']);
  expect(groups[0].entries.find(entry => entry.url === url('edge')).label).toBe('Alpha → Beta · REGULATES');
});

test('structured groups work without legacy triples and reject unsafe URLs', () => {
  const resources_tabs = { external_link_groups: [{ source_key: 'kegg', display_name: 'KEGG', entries: [
    { url: url('ok'), label: 'Insulin signaling', entities: [{ id: 'hsa04910', name: 'Insulin signaling', types: ['Pathway'] }], provenance: [] },
    { url: 'javascript:alert(1)', label: 'unsafe' },
  ] }] };
  const page = resolveResultPage({ result: { resources_tabs } });
  expect(page.supportingTabs.some(tab => tab.id === 'external_links')).toBe(true);
  expect(page.resourceTabs.external_link_groups[0].entries).toHaveLength(1);
});

test('missing context uses supplied description or URL; portals have descriptive labels', () => {
  const groups = normalizeExternalLinks({ external_links: [['Portal', 'Browse records', 'https://example.org'], ['Other', '', 'https://other.org'], ['Ensembl', 'old description', 'https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000000001']] }, { nodes: [{ id: 'ENSG00000000001', properties: { name: 'ADCY3' }, labels: ['Gene'] }] });
  expect(groups.flatMap(group => group.entries.map(entry => entry.label))).toEqual(['ADCY3', 'https://other.org', 'Browse records']);
});
