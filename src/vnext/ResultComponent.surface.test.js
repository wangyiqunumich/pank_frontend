import React from 'react';
import { render, screen } from '@testing-library/react';
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
