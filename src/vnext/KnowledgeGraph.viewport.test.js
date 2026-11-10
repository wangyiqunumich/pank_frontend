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
    return { fit: jest.fn(() => onFit({ zoom: 0.4, minZoom: 0.2 })), setFullscreen: jest.fn(), dispose: jest.fn() };
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

test('JSON download retains the original graph identifiers, zeroes, nulls and evidence properties', async () => {
  const source = { ...graph, nodes: graph.nodes.map(node => ({ ...node,
    '~properties': { ...node['~properties'], count: 0, supported: false, missing: null, source: { version: 'recorded' } } })) };
  const before = JSON.stringify(source);
  const previousCreate = URL.createObjectURL, previousRevoke = URL.revokeObjectURL;
  let blob;
  URL.createObjectURL = jest.fn(value => { blob = value; return 'blob:graph-json'; });
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  jest.useFakeTimers();
  try {
    const { unmount } = render(view(source));
    fireEvent.click(screen.getByRole('button', { name: 'Download', exact: true }));
    expect(click).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Download JSON' }));
    expect(click.mock.instances[0].download).toBe('knowledge_graph.json');
    expect(blob.type).toBe('application/json');
    act(() => jest.advanceTimersByTime(30000));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:graph-json');
    unmount();
    jest.useRealTimers();
    const content = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(blob);
    });
    expect(JSON.parse(content)).toEqual(source);
    expect(JSON.stringify(source)).toBe(before);
  } finally { jest.useRealTimers(); click.mockRestore(); URL.createObjectURL = previousCreate; URL.revokeObjectURL = previousRevoke; }
});

test('PNG export uses a bounded Blob and starts its download inside fullscreen', async () => {
  const previousCreate = URL.createObjectURL, previousRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:graph-image'); URL.revokeObjectURL = jest.fn();
  let downloadParent, downloadHref;
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloadParent = this.parentElement; downloadHref = this.href; });
  jest.useFakeTimers();
  try {
    const { unmount } = render(view());
    const cy = cytoscape.mock.results[0].value;
    cy.elements = () => ({ boundingBox: () => ({ w: 10000, h: 3000 }) });
    const png = new Blob(['PNG export'], { type: 'image/png' }); cy.png = jest.fn().mockResolvedValue(png);
    fireEvent.click(screen.getByRole('button', { name: 'Open in full screen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download', exact: true }));
    await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Download image' })));
    expect(cy.png).toHaveBeenCalledWith({ output: 'blob-promise', full: true, maxWidth: 4096, maxHeight: 4096 });
    expect(URL.createObjectURL).toHaveBeenCalledWith(png); expect(downloadHref).toBe('blob:graph-image');
    expect(downloadParent).toBe(screen.getByRole('dialog', { name: 'Fullscreen graph viewer' }));
    act(() => jest.advanceTimersByTime(30000));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:graph-image');
    unmount();
  } finally { jest.useRealTimers(); click.mockRestore(); URL.createObjectURL = previousCreate; URL.revokeObjectURL = previousRevoke; }
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
  const hover = cy.on.mock.calls.find(([event]) => event === 'mousemove')[1];
  act(() => hover({ target: edge, originalEvent: { clientX: 1000, clientY: 1000 } }));
  act(() => jest.advanceTimersByTime(600));
  expect(screen.getByText('Additional details')).toBeTruthy();
  expect(document.querySelector('[data-field="flag"]').textContent).toContain('false');
  expect(document.querySelector('[data-field="data_source"]').textContent).toContain('Recorded source');
  unmount();
  jest.useRealTimers();
});


test.each(['gene_enriched_in', 'gene_detected_in', 'anatomical_structure'])('%s card enlarges and pins independently of graph fullscreen', type => {
  jest.useFakeTimers();
  const { unmount } = render(view());
  const cy = cytoscape.mock.results[0].value;
  const node = type === 'anatomical_structure';
  const element = { id: () => 'info-object', nonempty: () => true, isEdge: () => !node, isNode: () => node,
    source: () => ({data: () => ({id:'CFTR',name:'CFTR'})}), target: () => ({data: () => ({id:'ductal',name:'ductal cell'})}),
    removed: () => false, position: () => ({ x: 10, y: 10 }), outerWidth: () => 30, outerHeight: () => 20,
    midpoint: () => ({ x: 10, y: 10 }), data: () => ({ id: 'info-object', type,
      ...(!node ? { source: 'CFTR', target: 'ductal' } : {}),
      evidence_properties: { name: 'Ductal evidence', data_source: 'Recorded source', count: 0, ...(!node ? Object.fromEntries(Array.from({length:20},(_,i)=>['measurement_'+i,i])) : {}) } }) };
  cy.getElementById = () => element; cy.pan = () => ({ x: 0, y: 0 });
  const hover = cy.on.mock.calls.find(([event]) => event === 'mousemove')[1];
  act(() => hover({ target: element }));
  act(() => jest.advanceTimersByTime(600));
  const compact = screen.getByRole('region', { name: 'Graph information' });
  expect(compact.parentElement).toBe(document.body);
  expect(compact.style.position).toBe('fixed');
  expect(screen.queryByRole('button', { name: 'Close information panel' })).toBeNull();
  if(node){expect(screen.queryByRole('button',{name:'Enlarge information panel'})).toBeNull();unmount();jest.useRealTimers();return;}
  fireEvent.click(screen.getByRole('button', { name: 'Enlarge information panel' }));
  const dialog = screen.getByRole('dialog', { name: 'Fullscreen graph viewer' });
  const large = screen.getByRole('region', { name: 'Expanded graph information' });
  expect(dialog.contains(large)).toBe(true);
  expect(screen.queryByRole('region', { name: 'Graph information' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Close information panel' })).toBeNull();
  fireEvent.mouseLeave(large);
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByRole('region', { name: 'Expanded graph information' })).toBe(large);
  fireEvent.click(screen.getByRole('button', { name: 'Minimize information panel' }));
  expect(screen.getByRole('dialog', { name: 'Fullscreen graph viewer' })).toBe(dialog);
  expect(screen.queryByRole('region', { name: 'Expanded graph information' })).toBeNull();
  expect(screen.queryByRole('region', { name: 'Graph information' })).toBeNull();
  act(() => jest.advanceTimersByTime(600));
  expect(screen.queryByRole('region', { name: 'Graph information' })).toBeNull();
  act(() => hover({ target: element }));
  act(() => jest.advanceTimersByTime(600));
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('region', { name: 'Graph information' })).toBeNull();
  act(() => hover({ target: element }));
  act(() => jest.advanceTimersByTime(600));
  fireEvent.click(screen.getByRole('button', { name: 'Enlarge information panel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Exit fullscreen graph' }));
  expect(screen.queryByRole('dialog', { name: 'Fullscreen graph viewer' })).toBeNull();
  expect(screen.queryByRole('region', { name: 'Expanded graph information' })).toBeNull();
  expect(screen.queryByRole('region', { name: 'Graph information' })).toBeNull();
  expect(cytoscape).toHaveBeenCalledTimes(1);
  unmount(); jest.useRealTimers();
});
