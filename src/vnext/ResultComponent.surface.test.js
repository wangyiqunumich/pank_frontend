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
    { id: 'functional_data', label: 'Functional Data', content: <div data-testid="functional-surface" /> },
  ] },
});

test.each([['answer', QuestionAnswerPage], ['plan', PlanConfirmationPage]])('%s scBrowser shell uses Figma colors without changing other panels or spacing', (_, Page) => {
  render(<Page data={data(false)} />);
  const style = id => getComputedStyle(screen.getByTestId(id).closest('.MuiPaper-root'));
  const sc = style('sc-surface'), graph = style('graph-surface'), functional = style('functional-surface');
  expect(sc.backgroundColor).toBe('rgb(255, 255, 255)');
  expect(sc.borderTopColor).toBe('rgba(226, 232, 240, 0.9)');
  [graph, functional].forEach(panel => {
    expect(panel.backgroundColor).toBe('rgb(249, 250, 251)');
    expect(panel.borderTopColor).toBe('#e6eaf2');
  });
  expect(sc.width).toBe(graph.width);
  expect(sc.padding).toBe(graph.padding);
  expect(sc.borderRadius).toBe(graph.borderRadius);
});

test.each([['answer', QuestionAnswerPage], ['plan', PlanConfirmationPage]])('%s full-bleed scBrowser remains transparent and borderless', (_, Page) => {
  render(<Page data={data(true)} />);
  const panel = getComputedStyle(screen.getByTestId('sc-surface').closest('.MuiPaper-root'));
  expect(panel.backgroundColor).toBe('transparent');
  expect(panel.borderTopStyle).not.toBe('solid');
});
