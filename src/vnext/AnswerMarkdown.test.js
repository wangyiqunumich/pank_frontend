import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AnswerMarkdown from './AnswerMarkdown';
import rehypeRaw from 'rehype-raw';

// Jest 27 does not resolve these package aliases; use their actual browser modules.
jest.mock('unist-util-visit-parents/do-not-use-color', () => jest.requireActual('unist-util-visit-parents/lib/color.js'), { virtual: true });
jest.mock('#minpath', () => jest.requireActual('vfile/lib/minpath.browser.js'), { virtual: true });
jest.mock('#minproc', () => jest.requireActual('vfile/lib/minproc.browser.js'), { virtual: true });
jest.mock('#minurl', () => jest.requireActual('vfile/lib/minurl.browser.js'), { virtual: true });

// Exercise the real GFM/HTML pipeline, including the React table nodes used by CSV.
// CRA/Jest needs --transformIgnorePatterns='^$' for these ESM markdown dependencies.
const table = `| Gene | Evidence |
| --- | --- |
| **ADCY3** | shared, limited |
| GSDMB | "recorded" |
| IL2RA | first signal |
| INS | fourth signal |`;

const readBlob = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsText(blob);
});

beforeEach(() => {
  window.URL.createObjectURL = jest.fn(() => 'blob:answer-table');
  window.URL.revokeObjectURL = jest.fn();
});
afterEach(() => jest.restoreAllMocks());

test.each(['default', 'compact'])('%s table downloads every source row with CSV escaping while collapsed', async density => {
  const clicked = [];
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureDownload() {
    clicked.push({ href: this.getAttribute('href'), download: this.getAttribute('download') });
  });
  render(<AnswerMarkdown density={density} answer={table} />);
  expect(screen.getByRole('button', { name: 'Show more' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
  const blob = window.URL.createObjectURL.mock.calls[0][0];
  expect(await readBlob(blob)).toBe('Gene,Evidence\nADCY3,"shared, limited"\nGSDMB,"""recorded"""\nIL2RA,first signal\nINS,fourth signal');
  expect(blob.type).toBe('text/csv;charset=utf-8;');
  expect(clicked).toEqual([{ href: 'blob:answer-table', download: 'ai-overview-table.csv' }]);
  expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:answer-table');
});

test('shared table retains expand, collapse and full-screen controls', async () => {
  const { container } = render(<AnswerMarkdown answer={table} />);
  const fourthRow = container.querySelector('table tbody').children[3];
  expect(getComputedStyle(fourthRow).display).toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
  expect(getComputedStyle(fourthRow).display).not.toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
  expect(getComputedStyle(fourthRow).display).toBe('none');
  const backdrop = container.querySelector('.MuiBackdrop-root');
  expect(backdrop.style.visibility).toBe('hidden');
  fireEvent.click(screen.getByRole('button', { name: 'Full Screen' }));
  expect(backdrop.style.visibility).not.toBe('hidden');
  expect(backdrop.querySelectorAll('tbody tr')).toHaveLength(4);
  fireEvent.click(screen.getByText('Close'));
  await waitFor(() => expect(backdrop.style.visibility).toBe('hidden'));
});

test('one-row summary tables retain the existing toolbar-free presentation', () => {
  render(<AnswerMarkdown answer={'| Gene | Count |\n| --- | --- |\n| ADCY3 | 28 |'} />);
  expect(screen.queryByRole('button', { name: 'Download CSV' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Full Screen' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  expect(screen.getByRole('cell', { name: '28' })).toBeTruthy();
});

test('compact summary changes typography while default main answer retains its styles', () => {
  const { rerender } = render(<AnswerMarkdown answer={'## Evidence\n\nRecorded association.'} />);
  expect(getComputedStyle(screen.getByText('Recorded association.')).fontSize).toBe('16px');
  expect(getComputedStyle(screen.getByRole('heading', { name: 'Evidence' })).fontSize).toBe('22px');
  rerender(<AnswerMarkdown density="compact" answer={'## Evidence\n\nRecorded association.'} />);
  expect(getComputedStyle(screen.getByText('Recorded association.')).fontSize).toBe('12px');
  expect(getComputedStyle(screen.getByRole('heading', { name: 'Evidence' })).fontSize).toBe('14px');
  rerender(<AnswerMarkdown answer={'## Evidence\n\nRecorded association.'} />);
  expect(getComputedStyle(screen.getByText('Recorded association.')).fontSize).toBe('16px');
});

test('citation pills keep explicit follow-up anchors, hover events and reference navigation', () => {
  const listener = jest.fn();
  const hover = jest.fn();
  window.addEventListener('pank:pmid-click', listener);
  window.addEventListener('pank:pmid-hover', hover);
  const target = document.createElement('div');
  target.id = 'reference-item-followup-2-12345678-1';
  target.scrollIntoView = jest.fn();
  document.body.appendChild(target);
  try {
    render(<AnswerMarkdown answer={'Evidence **[PMID: 12345678]** and [paper](https://pubmed.ncbi.nlm.nih.gov/12345678/).'}
      references={[{ pmid: '12345678', anchorId: 'main-anchor' }]}
      referenceAnchors={{ '12345678': target.id }} />);
    const links = screen.getAllByRole('link', { name: 'PMID 12345678' });
    expect(links).toHaveLength(2);
    expect(links.every(link => link.getAttribute('href') === `#${target.id}`)).toBe(true);
    fireEvent.mouseEnter(links[0]);
    expect(hover.mock.calls[0][0].detail).toEqual({ pmid: '12345678', anchorId: target.id });
    fireEvent.click(links[1]);
    expect(listener.mock.calls[0][0].detail).toEqual({ pmid: '12345678', anchorId: target.id });
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  } finally {
    window.removeEventListener('pank:pmid-click', listener);
    window.removeEventListener('pank:pmid-hover', hover);
    target.remove();
  }
});

test('vNext references use their existing anchors and generic links keep safe external targets', () => {
  render(<AnswerMarkdown answer={'[PMID: 12345678] with [source](https://example.org/evidence).'} references={[{ pmid: '12345678', anchorId: 'reference-main-12345678' }]} />);
  expect(screen.getByRole('link', { name: 'PMID 12345678' }).getAttribute('href')).toBe('#reference-main-12345678');
  const external = screen.getByRole('link', { name: 'source' });
  expect(external.getAttribute('target')).toBe('_blank');
  expect(external.getAttribute('rel')).toBe('noreferrer');
});

test('legacy HTML formatting is explicit and remains disabled for tool and vNext answers', () => {
  const answer = '<span data-testid="saved-html">Saved annotation</span>';
  const { rerender } = render(<AnswerMarkdown answer={answer} />);
  expect(screen.queryByTestId('saved-html')).toBeNull();
  rerender(<AnswerMarkdown answer={answer} legacyHtmlPlugin={rehypeRaw} />);
  expect(screen.getByTestId('saved-html').textContent).toBe('Saved annotation');
  rerender(<AnswerMarkdown answer={answer} density="compact" />);
  expect(screen.queryByTestId('saved-html')).toBeNull();
});

test.each(['default', 'compact'])('%s clipped cells retain full identifiers and annotations for hover and CSV', async density => {
  const signal = 'ENSG00000138031__ADCY3__ENSG00000138031.10_25062742_25062900__credibleSet1';
  const annotation = 'Verified member of both GWAS and QTL credible sets (recorded as QTL lead) [G1]';
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const { container } = render(<AnswerMarkdown density={density} answer={`| Signal | Role |\n| --- | --- |\n| ${signal} | ${annotation} |\n| second | short |`} />);
  expect(container.querySelector('tbody td .answer-table-cell').getAttribute('title')).toBe(signal);
  fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
  expect(await readBlob(window.URL.createObjectURL.mock.calls[0][0])).toBe(`Signal,Role\n${signal},${annotation}\nsecond,short`);
  fireEvent.click(screen.getByRole('button', { name: 'Full Screen' }));
  expect(container.querySelector('.MuiBackdrop-root tbody td .answer-table-cell').textContent).toBe(signal);
});


test('numbered citations and PubMed links use the same run-scoped reference', () => {
    render(<AnswerMarkdown answer="Paper [1](#citation-1) and [12345678](https://pubmed.ncbi.nlm.nih.gov/12345678/)." references={[{pmid:'12345678',citation_number:1,anchorId:'runA-reference-1'}]} />);
    const links = screen.getAllByRole('link', {name:'1'});
    expect(links).toHaveLength(2);
    expect(links.every(link => link.getAttribute('href') === '#runA-reference-1')).toBe(true);
    expect(screen.queryByText('PMID 12345678')).toBeNull();
});
