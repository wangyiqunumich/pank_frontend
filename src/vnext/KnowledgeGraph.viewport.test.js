import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import cytoscape from 'cytoscape';
import { observeGraphViewport } from './graphBindings';
import KnowledgeGraph from '../components/KnowledgeGraph';

let mockState = { queryResultPage: { queryResultPage: null } };
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({ useSelector: (selector) => selector(mockState), useDispatch: () => mockDispatch }));
jest.mock('cytoscape', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('./graphBindings', () => ({ ...jest.requireActual('./graphBindings'),
  observeGraphViewport: jest.fn(),
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

test('result polling with unchanged graph content preserves the renderer and user zoom; changed coordinates rebuild it', () => {
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
  expect(cytoscape).toHaveBeenCalledTimes(2);
  expect(controller.dispose).toHaveBeenCalledTimes(1);
  expect(cy.destroy).toHaveBeenCalledTimes(1);
  unmount();
  expect(observeGraphViewport.mock.results[1].value.dispose).toHaveBeenCalledTimes(1);
});

test('fitted viewport starts at 100%, enables zoom-out below0.6, and recenter refits the current pane', () => {
  const { unmount } = render(view());
  expect(screen.getByText('100%')).toBeTruthy();
  // The existing minus control is named "Zoom In" in the legacy icon assets.
  expect(screen.getByRole('button', { name: 'Zoom In' }).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Recenter' }));
  expect(observeGraphViewport.mock.results[0].value.fit).toHaveBeenCalledTimes(1);
  expect(cytoscape.mock.calls[0][0].layout).toEqual({ name: 'preset', fit: false });
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
  expect(screen.getByText('Recorded evidence')).toBeTruthy();
  expect(document.querySelector('[data-field="flag"]').textContent).toContain('false');
  expect(document.querySelector('[data-field="data_source"]').textContent).toContain('Recorded source');
  unmount();
  jest.useRealTimers();
});
