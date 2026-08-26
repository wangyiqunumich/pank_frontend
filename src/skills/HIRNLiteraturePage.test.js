import React from 'react';

import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { askHirn } from '../utils/hirnLiteratureApi';
import HIRNLiteraturePage from './HIRNLiteraturePage';

jest.mock('../components/AgentSidebar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../utils/hirnLiteratureApi', () => ({
  askHirn: jest.fn(),
}));

// react-markdown v9 is ESM-only, while this CRA Jest runner does not transform
// ESM dependencies. Page behavior is covered here; Markdown parsing is covered
// by the production build.
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => null,
}));

const fixture = {
  step: 'Complete',
  response: 'ZnT8 is a pancreatic beta-cell zinc transporter and an important type 1 diabetes autoantigen.',
  references: [
    {
      pmid: '38743124',
      id: '38743124',
      title: 'Example article about ZnT8 and type 1 diabetes',
      url: 'https://pubmed.ncbi.nlm.nih.gov/38743124/',
      n_citation: 12,
      date: 2024,
      journal: 'Example Journal',
      authors: ['A. Researcher', 'B. Scientist'],
      source: 'pmc_oa',
    },
    {
      pmid: '12345678',
      id: '12345678',
      title: 'Second example article for citation-card testing',
      url: 'https://pubmed.ncbi.nlm.nih.gov/12345678/',
      date: 2020,
      journal: 'Fixture Biology',
      authors: ['C. Developer'],
      source: 'pubmed_abstract',
    },
  ],
  trajectory: [],
  done: true,
};

const renderPage = () => render(
  <MemoryRouter>
    <HIRNLiteraturePage />
  </MemoryRouter>
);

const questionInput = () => screen.getByRole('textbox', {
  name: /ask a question about hirn literature/i,
});

const submitButton = () => screen.getByRole('button', {
  name: /ask hirn literature/i,
});

beforeEach(() => {
  jest.clearAllMocks();
});

test('keeps submission disabled until a plain-language question is entered', () => {
  renderPage();

  expect(submitButton().disabled).toBe(true);
  fireEvent.change(questionInput(), { target: { value: '   ' } });
  expect(submitButton().disabled).toBe(true);

  fireEvent.change(questionInput(), {
    target: { value: 'What is the role of ZnT8 in type 1 diabetes?' },
  });
  expect(submitButton().disabled).toBe(false);
});

test('renders the completed answer and its two associated PubMed references', async () => {
  askHirn.mockImplementation(async (_question, options) => {
    options.onEvent({ step: 'Reviewing selected articles', done: false });
    return fixture;
  });
  renderPage();

  const question = 'What is the role of ZnT8 in type 1 diabetes?';
  fireEvent.change(questionInput(), { target: { value: question } });
  fireEvent.click(submitButton());

  expect(await screen.findByText(fixture.response)).not.toBeNull();
  expect(screen.getAllByRole('article')).toHaveLength(2);
  expect(screen.queryByText(/Example evidence excerpt/)).toBeNull();

  const titleLink = screen.getByRole('link', {
    name: 'Example article about ZnT8 and type 1 diabetes',
  });
  expect(titleLink.getAttribute('href')).toBe('https://pubmed.ncbi.nlm.nih.gov/38743124/');
  expect(titleLink.getAttribute('target')).toBe('_blank');
  expect(titleLink.getAttribute('rel')).toContain('noopener');
  expect(screen.getByRole('link', { name: 'PMID 38743124' }).getAttribute('href'))
    .toBe('https://pubmed.ncbi.nlm.nih.gov/38743124/');
  expect(askHirn).toHaveBeenCalledWith(question, expect.objectContaining({
    signal: expect.any(AbortSignal),
    onEvent: expect.any(Function),
  }));
});

test('renders a meeting abstract without PMID or a dead link', async () => {
  askHirn.mockResolvedValue({
    step: 'Complete',
    response: 'TET2-deficient beta cells resisted autoimmune cell death [HIRN2025_p031].',
    references: [{
      id: 'HIRN2025_p031',
      pmid: null,
      url: null,
      title: 'TET2 Deficient Beta Cells are Resistant to Autoimmune Cell Death',
      journal: 'HIRN 2025 Annual Investigator Meeting',
      date: 2025,
      authors: ['Jinxiu Rui'],
      source: 'meeting_abstract',
    }],
  });
  renderPage();

  fireEvent.change(questionInput(), { target: { value: 'What does the TET2 abstract report?' } });
  fireEvent.click(submitButton());

  expect(await screen.findByText('HIRN2025_p031')).not.toBeNull();
  expect(screen.queryByText(/PMID null/i)).toBeNull();
  expect(screen.queryByRole('link', { name: /TET2 Deficient Beta Cells/ })).toBeNull();
});

test('treats an empty-reference Complete frame as a successful closed-corpus refusal', async () => {
  askHirn.mockResolvedValue({
    step: 'Complete',
    response: 'Not found in the HIRN article library.',
    references: [],
    done: true,
  });
  renderPage();

  fireEvent.change(questionInput(), { target: { value: 'How did moon landing navigation work?' } });
  fireEvent.click(submitButton());

  expect(await screen.findByText('Not found in this library')).not.toBeNull();
  expect(screen.getByText(/successful closed-corpus result/i)).not.toBeNull();
  expect(screen.queryByText(/Unable to complete/)).toBeNull();
});

test('cancels an in-flight request and leaves the composer usable', async () => {
  askHirn.mockImplementation((_question, options) => new Promise((_resolve, reject) => {
    options.onEvent({
      step: 'Searching for relevant articles',
      type: 'progress',
      phase: 'searching',
      label: 'Searching the HIRN library',
    });
    options.signal.addEventListener('abort', () => {
      const error = new Error('cancelled');
      error.name = 'AbortError';
      reject(error);
    });
  }));
  renderPage();

  fireEvent.change(questionInput(), {
    target: { value: 'Which HIRN studies describe beta-cell stress?' },
  });
  fireEvent.click(submitButton());

  expect(await screen.findByText('Searching the HIRN library')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(await screen.findByText('Request cancelled')).not.toBeNull();
  expect(questionInput().disabled).toBe(false);
  expect(submitButton().disabled).toBe(false);
  expect(screen.getByRole('button', { name: 'Retry' })).not.toBeNull();
});

test('retries the submitted question after a retryable error', async () => {
  askHirn
    .mockRejectedValueOnce(new Error('HIRN request failed with HTTP 503.'))
    .mockResolvedValueOnce(fixture);
  renderPage();

  const question = 'How does islet inflammation affect beta cells?';
  fireEvent.change(questionInput(), { target: { value: question } });
  fireEvent.click(submitButton());

  expect(await screen.findByText('HIRN request failed with HTTP 503.')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByText(fixture.response)).not.toBeNull();
  expect(askHirn).toHaveBeenCalledTimes(2);
  expect(askHirn.mock.calls[1][0]).toBe(question);
});
