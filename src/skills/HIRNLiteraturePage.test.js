import React from 'react';

import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  askHirnAgent,
  getHirnAgentUsageStatus,
} from '../utils/hirnAgentApi';
import { askHirn } from '../utils/hirnLiteratureApi';
import HIRNLiteraturePage from './HIRNLiteraturePage';

jest.mock('../components/AgentSidebar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../utils/hirnLiteratureApi', () => ({
  askHirn: jest.fn(),
}));

jest.mock('../utils/hirnAgentApi', () => ({
  askHirnAgent: jest.fn(),
  getHirnAgentUsageStatus: jest.fn(),
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
  getHirnAgentUsageStatus.mockImplementation(() => new Promise(() => {}));
});

test('uses Standard search by default', () => {
  renderPage();

  expect(screen.getByRole('button', { name: 'Standard search' }).getAttribute('aria-pressed'))
    .toBe('true');
  expect(screen.getByRole('button', { name: 'Agent search' }).getAttribute('aria-pressed'))
    .toBe('false');
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

test('submits with Enter and keeps Shift+Enter available for a new line', () => {
  askHirn.mockImplementation(() => new Promise(() => {}));
  renderPage();

  fireEvent.change(questionInput(), {
    target: { value: 'What is the role of ZnT8 in type 1 diabetes?' },
  });
  fireEvent.keyDown(questionInput(), { key: 'Enter', shiftKey: true });
  expect(askHirn).not.toHaveBeenCalled();

  fireEvent.keyDown(questionInput(), { key: 'Enter' });
  expect(askHirn).toHaveBeenCalledTimes(1);
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

test('places a contextual follow-up composer below a completed answer', async () => {
  askHirn
    .mockResolvedValueOnce(fixture)
    .mockResolvedValueOnce({
      ...fixture,
      response: 'Follow-up raw HIRN answer.',
      references: fixture.references.slice(0, 1),
    });
  renderPage();

  const firstQuestion = 'What is the role of ZnT8 in type 1 diabetes?';
  fireEvent.change(questionInput(), { target: { value: firstQuestion } });
  fireEvent.click(submitButton());
  expect(await screen.findByText(fixture.response)).not.toBeNull();
  expect(screen.getByText('Ask a follow-up question')).not.toBeNull();

  const followUp = 'What happens in beta cells?';
  fireEvent.change(questionInput(), { target: { value: followUp } });
  fireEvent.click(screen.getByRole('button', { name: 'Ask follow-up' }));

  expect(await screen.findByText('Follow-up raw HIRN answer.')).not.toBeNull();
  const expandedQuestion = askHirn.mock.calls[1][0];
  expect(expandedQuestion).toContain(firstQuestion);
  expect(expandedQuestion).toContain(fixture.response);
  expect(expandedQuestion).toContain(`Follow-up question: ${followUp}`);
});

test('shows the selected raw HIRN answer and expandable alternatives in Agent mode', async () => {
  askHirnAgent.mockResolvedValue({
    request_id: 'agent-1',
    selected: {
      query: 'IFIH1 beta-cell antiviral response',
      result: {
        response: 'Selected raw HIRN answer.',
        references: fixture.references.slice(0, 1),
      },
    },
    alternatives: [{
      attempt_id: 'r1-2',
      query: 'MDA5 viral sensing in T1D',
      result: {
        response: 'Alternative raw HIRN answer.',
        references: fixture.references.slice(1),
      },
    }],
    usage_status: { warning_active: false },
  });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Agent search' }));
  fireEvent.change(questionInput(), { target: { value: 'What is the role of MDA5 in T1D?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run Agent Search' }));

  expect(await screen.findByText('Selected raw HIRN answer.')).not.toBeNull();
  expect(screen.getByText(/Selected HIRN query: IFIH1/)).not.toBeNull();
  expect(screen.getByText('Alternative HIRN answers (1)')).not.toBeNull();
  fireEvent.click(screen.getByText('Alternative 1'));
  expect(await screen.findByText('Alternative raw HIRN answer.')).not.toBeNull();
  expect(askHirn).not.toHaveBeenCalled();
});

test('shows the frontend warning banner when estimated monthly cost reaches $100', async () => {
  getHirnAgentUsageStatus.mockResolvedValue({
    warning_active: true,
    estimated_monthly_cost_usd: 100.1,
    warning_threshold_usd: 100,
  });
  renderPage();

  expect(await screen.findByText(/estimated \$100\.10 this month/i)).not.toBeNull();
  expect(screen.getByText(/runbomao@umich\.edu/i)).not.toBeNull();
});
