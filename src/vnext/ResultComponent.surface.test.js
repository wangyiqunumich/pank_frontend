import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import QuestionAnswerPage, { PlanConfirmationPage } from './ResultComponent';

jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
const data = fullBleed => ({ questionId: 'Q1', title: 'Surface color regression',
  aiOverview: { sections: [] },
  visualMaterial: { tabs: [
    { id: 'graph_viewer', label: 'Knowledge Graph', content: <div data-testid="graph-surface" /> },
    { id: 'single_cell_browser', label: 'scBrowser', fullBleed, content: <div data-testid="sc-surface" /> },
    { id: 'functional_browser', label: 'Functional Data', content: <div data-testid="functional-surface" /> },
  ] },
});

test.each([['answer', QuestionAnswerPage], ['plan', PlanConfirmationPage]])('%s module shells share the new browser surface and leave spacing to each viewer', (_, Page) => {
  render(<Page data={data(false)} />);
  const style = id => getComputedStyle(screen.getByTestId(id).closest('.MuiPaper-root'));
  const sc = style('sc-surface'), graph = style('graph-surface'), functional = style('functional-surface');
  [sc, graph, functional].forEach(panel => {
    expect(panel.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(panel.borderTopColor).toBe('#e2e8f0');
    expect(panel.padding).toBe('0px');
    expect(panel.borderRadius).toBe('12px');
    expect(panel.overflow).toBe('hidden');
  });
  expect(sc.width).toBe(graph.width);
});

test.each([['answer', QuestionAnswerPage], ['plan', PlanConfirmationPage]])('%s full-bleed scBrowser remains transparent and borderless', (_, Page) => {
  render(<Page data={data(true)} />);
  const panel = getComputedStyle(screen.getByTestId('sc-surface').closest('.MuiPaper-root'));
  expect(panel.backgroundColor).toBe('transparent');
  expect(panel.borderTopStyle).not.toBe('solid');
});

test.each([['answer', QuestionAnswerPage], ['plan', PlanConfirmationPage]])('%s preserves the chosen module when earlier tabs arrive and consumes each guide request once', (_, Page) => {
  const view = data(false);
  const graph = view.visualMaterial.tabs[0], atlas = view.visualMaterial.tabs[1], functional = view.visualMaterial.tabs[2];
  view.visualMaterial = { scopeKey: 'run-one', tabs: [graph, atlas] };
  const { rerender } = render(<Page data={view} />);
  fireEvent.click(screen.getByRole('tab', { name: 'scBrowser' }));
  rerender(<Page data={{ ...view, visualMaterial: { ...view.visualMaterial, tabs: [functional, graph, atlas] } }} />);
  expect(screen.getByRole('tab', { name: 'scBrowser', selected: true })).toBeTruthy();
  const request = { id: 'functional_browser', nonce: 1 };
  rerender(<Page data={{ ...view, visualMaterial: { ...view.visualMaterial, tabs: [functional, graph, atlas], requestedTab: request } }} />);
  expect(screen.getByRole('tab', { name: 'Functional Data', selected: true })).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Knowledge Graph' }));
  rerender(<Page data={{ ...view, visualMaterial: { ...view.visualMaterial, tabs: [graph, atlas, functional], requestedTab: request } }} />);
  expect(screen.getByRole('tab', { name: 'Knowledge Graph', selected: true })).toBeTruthy();
  rerender(<Page data={{ ...view, visualMaterial: { scopeKey: 'run-two', tabs: [atlas, graph] } }} />);
  expect(screen.getByRole('tab', { name: 'scBrowser', selected: true })).toBeTruthy();
});

test('supporting material selection follows its identity when streamed references precede it', () => {
  const view = { ...data(false), evidences: { tabs: [{ id: 'external_links', label: 'External Links', content: <p>Chosen source</p> }] } };
  const { rerender } = render(<QuestionAnswerPage data={view} />);
  rerender(<QuestionAnswerPage data={{ ...view, evidences: { tabs: [
    { id: 'references', label: 'References', content: <p>Newly returned references</p> }, ...view.evidences.tabs,
  ] } }} />);
  expect(within(screen.getByRole('tablist', { name: 'Supporting materials' })).getByRole('tab', { name: 'External Links', selected: true })).toBeTruthy();
  expect(getComputedStyle(screen.getByText('Chosen source').parentElement).display).toBe('block');
});
