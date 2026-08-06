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
      title: 'Example article about ZnT8 and type 1 diabetes',
      url: 'https://pubmed.ncbi.nlm.nih.gov/38743124/',
      n_citation: 12,
      date: 2024,
      journal: 'Example Journal',
      authors: ['A. Researcher', 'B. Scientist'],
      evidence: [
        {
          quote: 'Example evidence excerpt for offline interface development.',
          context_type: 'abstract',
        },
      ],
    },
    {
      pmid: '12345678',
      title: 'Second example article for citation-card testing',
      url: 'https://pubmed.ncbi.nlm.nih.gov/12345678/',
      date: 2020,
      journal: 'Fixture Biology',
      authors: ['C. Developer'],
      evidence: [
        {
          quote: 'Synthetic fixture content; do not cite this record.',
          context_type: 'fixture',
        },
      ],
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
  expect(screen.getByText(/Example evidence excerpt for offline interface development/)).not.toBeNull();
  expect(screen.getAllByText('Evidence')).toHaveLength(2);

  const titleLink = screen.getByRole('link', {
    name: 'Example article about ZnT8 and type 1 diabetes',
  });
  expect(titleLink.getAttribute('href')).toBe('https://pubmed.ncbi.nlm.nih.gov/38743124/');
  expect(titleLink.getAttribute('target')).toBe('_blank');
  expect(titleLink.getAttribute('rel')).toContain('noopener');
  expect(screen.getByRole('link', { name: 'PMID: 38743124' }).getAttribute('href'))
    .toBe('https://pubmed.ncbi.nlm.nih.gov/38743124/');
  expect(askHirn).toHaveBeenCalledWith(question, expect.objectContaining({
    maxArticles: 10,
    signal: expect.any(AbortSignal),
    onEvent: expect.any(Function),
  }));
});

test('cancels an in-flight request and leaves the composer usable', async () => {
  askHirn.mockImplementation((_question, options) => new Promise((_resolve, reject) => {
    options.onEvent({ step: 'Searching PubMed', done: false });
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

  expect(await screen.findByText('Searching PubMed')).not.toBeNull();
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
