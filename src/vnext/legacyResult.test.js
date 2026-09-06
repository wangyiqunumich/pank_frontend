import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LegacyResultPresentation from './LegacyResultPresentation';
import { legacyPresentationData, safeLegacyHref } from './legacyResultData';

jest.mock('react-markdown', () => {
  const React = require('react');
  return { __esModule: true, default: ({ children, components }) => <>{children.split(/\n\s*\n/).map((text, index) => <React.Fragment key={index}>{components.p({ children: text })}</React.Fragment>)}</> };
});
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
jest.mock('../components/KnowledgeGraph', () => ({ __esModule: true, default: ({ graphData, edgeRoutes }) => <div data-testid="legacy-graph">{graphData.nodes.length} nodes; {Object.keys(edgeRoutes || {}).length} routes</div> }));
const result = { status: 'ready', question: 'Which variants affect GCLC?', answer: 'The recorded graph links GCLC and a variant. [G1]',
  combined_query_result: { nodes: [{ '~id': 'g1', '~labels': ['Gene'], '~properties': { name: 'GCLC' } }], edges: [] }, edge_routes: { e1: {} },
  resources_tabs: { references: { paper: { id: 'paper', pmid: '12345678', title: 'Public reference', journal: 'Journal', date: '2025' } },
    empirical_evidence: { title: 'Verified plot', description: 'Returned observation', legend: 'View', link_text: 'Download original', image_url: '/api/resources/assets/plot.png', download_url: '/api/resources/assets/data.txt' },
    pankbase_links: [['PanKbase', 'https://pankbase.org']], external_links: [['Source', 'Ensembl', 'https://ensembl.org']] }, component_status: { answer: 'ready' },
};
test('legacy data adapter uses actual resources and preserves incomplete evidence notice', () => {
  const before = JSON.stringify(result);
  const data = legacyPresentationData({ ...result, display: { notice: 'Showing 1 of 2 nodes; evidence is partial.' } }, new URLSearchParams('sourceTerm=snp&targetTerm=gene@g1&relationship=QTL'));
  expect(data.aiAnswer.answers[0]).toContain('evidence is partial');
  expect(data.articlesData[0].data).toMatchObject({ title: 'Public reference', fulljournalname: 'Journal', pubdate: '2025', authors: [] });
  expect(data.nextQuestions[0].link).toContain('gene@g1');
  expect(JSON.stringify(result)).toBe(before);
});
test('legacy presentation preserves old columns, tabs, graph routes and local resource controls without requests', async () => {
  global.fetch = jest.fn();
  const data = legacyPresentationData(result);
  render(<LegacyResultPresentation data={data} />);
  expect(screen.getByText('Question')).toBeTruthy();
  expect(screen.getByText('You May Also Ask')).toBeTruthy();
  expect(screen.getByText("AI's Overview")).toBeTruthy();
  expect(screen.getByText('Graph Viewer')).toBeTruthy();
  expect(screen.getByTestId('legacy-graph').textContent).toBe('1 nodes; 1 routes');
  expect(screen.getByRole('link', { name: 'CANCEL' }).getAttribute('href')).toBe('/pankgraph-vnext/');
  expect(await screen.findByText(/recorded graph links/)).toBeTruthy();
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['References', 'Empirical Evidence', 'PanKbase Links', 'External Links']);
  fireEvent.click(screen.getByRole('tab', { name: 'Empirical Evidence' }));
  expect(screen.getByRole('link', { name: 'Download original' }).getAttribute('href')).toBe('/pankgraph-vnext/api/resources/assets/data.txt');
  expect(screen.getAllByAltText('Empirical Evidence').every((img) => img.getAttribute('src') === '/pankgraph-vnext/api/resources/assets/plot.png')).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
test('legacy links reject script and protocol-relative targets', () => {
  expect(safeLegacyHref('javascript:alert(1)')).toBeUndefined();
  expect(safeLegacyHref('//untrusted.example')).toBeUndefined();
  expect(safeLegacyHref('/result?sourceTerm=gene@g1')).toBe('/pankgraph-vnext/result?sourceTerm=gene@g1');
});
test('separate Markdown paragraphs use blocks while a plain-text answer keeps its original wrapper', async () => {
  const { rerender } = render(<LegacyResultPresentation data={legacyPresentationData({ ...result, answer: 'First paragraph.\n\nSecond paragraph.' })} />);
  const first = await screen.findByText('First paragraph.');
  const second = await screen.findByText('Second paragraph.');
  expect(first.closest('p')).not.toBeNull();
  expect(second.closest('p')).not.toBe(first.closest('p'));
  rerender(<LegacyResultPresentation data={legacyPresentationData({ ...result, answer: 'Plain fixture paragraph.' })} />);
  expect((await screen.findByText('Plain fixture paragraph.')).closest('p')).toBeNull();
});
test('graph provenance remains non-italic reference content and is never used as a journal', () => {
  const data = legacyPresentationData({ ...result, resources_tabs: { references: { paper: { pmid: '12345678', title: 'Reference title', subtitle: 'Reference supplied by graph evidence' } } } });
  expect(data.articlesData[0].data.fulljournalname).toBe('');
  render(<LegacyResultPresentation data={data} />);
  const provenance = screen.getByText('Reference supplied by graph evidence');
  expect(provenance.closest('i')).toBeNull();
  expect(provenance.closest('li').querySelector('i')).toBeNull();
});
test('a display notice cannot suppress the loading indication before the answer arrives', () => {
  const data = legacyPresentationData({ ...result, answer: '', component_status: { answer: 'pending' }, display: { notice: 'Showing 1 of 2 nodes.' } });
  expect(data.aiAnswer).toEqual({ answers: [], pending: true });
  expect(data.displayNotice).toBe('Showing 1 of 2 nodes.');
  render(<LegacyResultPresentation data={data} />);
  expect(screen.getByText(/Loading AI's overview/).textContent).toContain('Showing 1 of 2 nodes.');
  expect(screen.queryByText('The answer is unavailable.')).toBeNull();
});
