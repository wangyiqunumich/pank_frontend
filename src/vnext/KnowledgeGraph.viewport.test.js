import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import cytoscape from 'cytoscape';
import { observeGraphViewport, updateGraphElements } from './graphBindings';
import KnowledgeGraph from './KnowledgeGraph';

let mockState = { queryResultPage: { queryResultPage: null } };
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({ useSelector: (selector) => selector(mockState), useDispatch: () => mockDispatch }));
jest.mock('cytoscape', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('./graphBindings', () => ({ ...jest.requireActual('./graphBindings'),
  observeGraphViewport: jest.fn(),
  updateGraphElements: jest.fn(),
}));
const graph = { nodes: [{ '~id': 'g1', '~labels': ['Gene'], display_type: 'gene', '~properties': { name: 'CFTR' } }], edges: [] };
const positions = { g1: { x: 1, y: 2, Level: 'Core' } };
const view = (data = graph, coords = positions) => <MemoryRouter><KnowledgeGraph graphData={data} coordData={coords} /></MemoryRouter>;

beforeEach(() => {
  jest.clearAllMocks(); mockState = { queryResultPage: { queryResultPage: null } };
  cytoscape.mockImplementation(({ container }) => {
    let zoom = 0.4;
    return { container: () => container, batch: (callback) => callback(), on: jest.fn(),
      width: () => 600, height: () => 630, zoom: (value) => { if (typeof value === 'number') zoom = value; return zoom; },
      removeAllListeners: jest.fn(), destroy: jest.fn() };
  });
  observeGraphViewport.mockImplementation((cy, container, onFit) => {
    onFit({ zoom: 0.4, minZoom: 0.2 });
    return { fit: jest.fn(() => onFit({ zoom: 0.4, minZoom: 0.2 })), dispose: jest.fn() };
  });
});

test('result polling and changed server coordinates preserve the renderer and user zoom until unmount', () => {
  const { rerender, unmount } = render(view());
  expect(cytoscape).toHaveBeenCalledTimes(1);
  const cy = cytoscape.mock.results[0].value;
  const controller = observeGraphViewport.mock.results[0].value;
  cy.zoom(2);
  mockState = { queryResultPage: { queryResultPage: { answer: 'Optional answer completed', resources: {} } } };
  rerender(view(JSON.parse(JSON.stringify(graph)), JSON.parse(JSON.stringify(positions))));
  expect(cytoscape).toHaveBeenCalledTimes(1);
  expect(cy.zoom()).toBe(2);
  expect(controller.dispose).not.toHaveBeenCalled();
  rerender(view(graph, { g1: { ...positions.g1, x: 10 } }));
  expect(cytoscape).toHaveBeenCalledTimes(1);
  expect(updateGraphElements).toHaveBeenCalledTimes(1);
  expect(cy.zoom()).toBe(2);
  expect(controller.dispose).not.toHaveBeenCalled();
  expect(cy.destroy).not.toHaveBeenCalled();
  unmount();
  expect(controller.dispose).toHaveBeenCalledTimes(1);
  expect(cy.destroy).toHaveBeenCalledTimes(1);
});

test('fitted viewport starts at 100%, enables zoom-out below0.6, and recenter refits the current pane', () => {
  const { unmount } = render(view());
  expect(screen.getByText('100%')).toBeTruthy();
  // The minus control now uses its correct accessible zoom-out label.
  expect(screen.getByRole('button', { name: 'Zoom out' }).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Fit to view' }));
  expect(observeGraphViewport.mock.results[0].value.fit).toHaveBeenCalledTimes(1);
  expect(cytoscape.mock.calls[0][0].layout).toEqual({ name: 'preset', fit: false });
  unmount();
});

test('fullscreen keeps the original renderer and camera, leaves the route untouched and exits with Escape', () => {
  const history = jest.spyOn(window.history, 'pushState');
  const { unmount } = render(view());
  const cy = cytoscape.mock.results[0].value;
  cy.zoom(2);
  fireEvent.click(screen.getByRole('button', { name: 'Open in full screen' }));
  expect(screen.getByRole('dialog', { name: 'Fullscreen graph viewer' })).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Fullscreen graph viewer' }));
  expect(cytoscape).toHaveBeenCalledTimes(1); expect(cy.zoom()).toBe(2);
  expect(history).not.toHaveBeenCalled(); expect(cy.destroy).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('dialog', { name: 'Fullscreen graph viewer' }), { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Fullscreen graph viewer' })).toBeNull();
  expect(cytoscape).toHaveBeenCalledTimes(1); expect(cy.zoom()).toBe(2);
  unmount(); history.mockRestore();
});

test('fullscreen search retains its DOM and focus while zoom updates rerender the graph', () => {
  const { unmount } = render(view());
  fireEvent.click(screen.getByRole('button', { name: 'Open in full screen' }));
  const search = screen.getByRole('textbox', { name: 'Search graph' });
  fireEvent.input(search, { target: { value: 'CFTR' } }); search.focus();
  const cy = cytoscape.mock.results[0].value;
  const zoomChanged = cy.on.mock.calls.find(([event]) => event === 'zoom')[1];
  act(() => { cy.zoom(2); zoomChanged(); });
  expect(screen.getByRole('textbox', { name: 'Search graph' })).toBe(search);
  expect(document.activeElement).toBe(search);
  expect(search.value).toBe('CFTR');
  unmount();
});

test('hover on a visible offset edge label opens its scientific evidence without a midpoint-distance gate', () => {
  jest.useFakeTimers();
  const { unmount } = render(view());
  const cy = cytoscape.mock.results[0].value;
  const edge = { id: () => 'edge-label', nonempty: () => true, isNode: () => false, removed: () => false,
    midpoint: () => ({ x: 0, y: 0 }), data: () => ({ source: 'CFTR', target: 'ductal', type: 'gene_detected_in',
      evidence_properties: { median_donor_cpm: 0, data_source: 'Recorded source', flag: false } }) };
  cy.getElementById = () => edge;
  cy.pan = () => ({ x: 0, y: 0 });
  cy.renderer = () => ({ projectIntoViewport: () => [1000, 1000] });
  const hover = cy.on.mock.calls.find(([event, selector]) => event === 'mousemove' && selector === 'edge')[2];
  act(() => hover({ target: edge, originalEvent: { clientX: 1000, clientY: 1000 } }));
  act(() => jest.advanceTimersByTime(600));
  expect(screen.getByText('Additional details')).toBeTruthy();
  expect(document.querySelector('[data-field="flag"]').textContent).toContain('false');
  expect(document.querySelector('[data-field="data_source"]').textContent).toContain('Recorded source');
  unmount();
  jest.useRealTimers();
});
