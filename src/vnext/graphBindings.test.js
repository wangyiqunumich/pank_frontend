import cytoscape from 'cytoscape';
import { applyGraphRoutes, calculateGraphViewport, graphElements, observeGraphViewport, spreadCompactLayout } from './graphBindings';

const graph = {
  nodes: ['gene', 'cell'].map((id) => ({ '~id': id, '~labels': [id], '~properties': { name: id } })),
  edges: ['enrichment', 'detection', 'unrouted'].map((id) => ({ '~id': id, '~start': 'gene', '~end': 'cell', '~type': id, '~properties': {} })),
};
const positions = { gene: { x: 0, y: 0 }, cell: { x: 100, y: 0 } };
const routes = {
  enrichment: { route_type: 'bezier', source_port: [5, 0], target_port: [95, 0], control_points: [[30, 20], [70, 20]], label_visible: false },
  detection: { route_type: 'polyline', source_port: [5, 0], target_port: [95, 0], waypoints: [[30, -20], [70, -20]], label_visible: true },
};

test('real Cytoscape attaches parallel edges before applying routed curve styles', () => {
  const { nodes, edges, edgeStyles } = graphElements(graph, positions, routes);
  // An element-creation curve-style bypass reproduces Cytoscape's _private
  // parallelEdges crash. The constructor must receive only graph elements.
  expect(edges.every((edge) => !Object.prototype.hasOwnProperty.call(edge, 'style'))).toBe(true);
  const cy = cytoscape({ headless: true, styleEnabled: true, elements: { nodes, edges }, layout: { name: 'preset' }, style: [{ selector: 'edge', style: { label: 'data(label)', 'curve-style': 'bezier' } }] });
  try {
    expect(() => applyGraphRoutes(cy, edgeStyles)).not.toThrow();
    const enrichment = cy.getElementById('enrichment');
    const detection = cy.getElementById('detection');
    expect(enrichment.source().id()).toBe('gene');
    expect(enrichment.target().id()).toBe('cell');
    expect(enrichment.parallelEdges()).toHaveLength(3);
    expect(enrichment.style('curve-style')).toBe('unbundled-bezier');
    expect(enrichment.style('control-point-weights')).toBe('0.3 0.7');
    expect(enrichment.style('control-point-distances')).toBe('20px 20px');
    expect(enrichment.style('source-endpoint')).toBe('5px 0px');
    expect(enrichment.style('target-endpoint')).toBe('-5px 0px');
    expect(enrichment.style('text-opacity')).toBe('1');
    expect(enrichment.style('text-events')).toBe('yes');
    expect(enrichment.style('label')).toBe('enrichment');
    expect(detection.style('curve-style')).toBe('segments');
    expect(detection.style('segment-distances')).toBe('-20px -20px');
    expect(detection.style('label')).toBe('detection');
    expect(cy.getElementById('unrouted').style('curve-style')).toBe('bezier');
    expect(cy.getElementById('unrouted').style('text-opacity')).toBe('1');
    expect(cy.getElementById('unrouted').style('text-events')).toBe('yes');
    expect(new Set(cy.edges().map((edge) => edge.style('text-margin-y'))).size).toBe(3);
  } finally { cy.destroy(); }
});

test('route bindings retain inverted endpoints and can be reapplied safely', () => {
  const { nodes, edges, edgeStyles } = graphElements(graph, positions, routes, { edgeIsInverted: { enrichment: true } });
  const cy = cytoscape({ headless: true, styleEnabled: true, elements: { nodes, edges }, layout: { name: 'preset' } });
  try {
    applyGraphRoutes(cy, edgeStyles);
    applyGraphRoutes(cy, edgeStyles);
    const edge = cy.getElementById('enrichment');
    expect(edge.source().id()).toBe('cell');
    expect(edge.target().id()).toBe('gene');
    expect(edge.style('source-endpoint')).toBe('-5px 0px');
    expect(edge.style('target-endpoint')).toBe('5px 0px');
    expect(edge.style('control-point-distances')).toBe('-20px -20px');
  } finally { cy.destroy(); }
});

test('visible parallel labels are stable across input ordering and preserve full evidence separately from renderer keys', () => {
  const raw = { source: 'scientific source', id: 'source record id', padj: 0, confidence: false,
    provenance: { file: 'evidence.tsv', version: 'test' }, data_source: 'Measured evidence' };
  const input = { ...graph, edges: graph.edges.map((edge) => ({ ...edge, '~properties': raw })) };
  const before = JSON.stringify(input);
  const first = graphElements(input, positions, routes);
  const reversed = graphElements({ ...input, edges: input.edges.slice().reverse() }, positions, routes);
  first.edges.forEach((edge) => {
    expect(edge.data.evidence_properties).toEqual(raw);
    expect(edge.data.source).toBe('gene');
    expect(edge.data.id).not.toBe(raw.id);
    expect(first.edgeStyles.get(edge.data.id)).toEqual(reversed.edgeStyles.get(edge.data.id));
  });
  expect(JSON.stringify(input)).toBe(before);
});

test('blank display labels fall back to the relationship type', () => {
  const input = { ...graph, edges: [{ ...graph.edges[0], display_label: '   ', '~type': 'GENE_ENRICHED_IN' }] };
  expect(graphElements(input, positions).edges[0].data.label).toBe('GENE ENRICHED IN');
});

// Geometry from the reported three-node CFTR result, without biological rows.
const compactGraph = {
  nodes: ['CFTR', 'ductal', 'MUC5B'].map((id) => ({ '~id': id, '~labels': ['Gene'], '~properties': { name: id } })),
  edges: [{ '~id': 'detected', '~start': 'CFTR', '~end': 'ductal', '~type': 'GENE_DETECTED_IN' },
    { '~id': 'enriched', '~start': 'CFTR', '~end': 'ductal', '~type': 'GENE_ENRICHED_IN' }],
};
const compactPositions = { CFTR: { x: 51.8, y: -26, width: 24.4, height: 16 },
  ductal: { x: 51.8, y: -47.333, width: 49.6, height: 16 }, MUC5B: { x: 51.8, y: -4.667, width: 67.6, height: 16 } };
const compactRoutes = { detected: { source_port: [51.8, -34], target_port: [51.8, -39.333],
  control_points: [[52.467, -35.707], [52.467, -37.626]], route_type: 'bezier', label_visible: false },
enriched: { source_port: [53.467, -34], target_port: [53.467, -39.333],
  control_points: [[59.133, -35.707], [59.133, -37.626]], route_type: 'bezier', label_visible: false } };

function geometryBounds(positions, routes = {}) {
  const points = Object.values(positions).flatMap((p) => [{ x: p.x - (p.width || 40) / 2, y: p.y - (p.height || 16) / 2 },
    { x: p.x + (p.width || 40) / 2, y: p.y + (p.height || 16) / 2 }]);
  Object.values(routes).forEach((route) => (route.control_points || route.waypoints || []).forEach((p) => points.push(Array.isArray(p) ? { x: p[0], y: p[1] } : p)));
  return { x1: Math.min(...points.map((p) => p.x)), x2: Math.max(...points.map((p) => p.x)),
    y1: Math.min(...points.map((p) => p.y)), y2: Math.max(...points.map((p) => p.y)) };
}

test('reported compact CFTR layout gains legible spacing and a fitted 100% baseline without detaching routes', () => {
  const original = JSON.stringify([compactGraph, compactPositions, compactRoutes]);
  const spread = spreadCompactLayout(compactGraph, compactPositions, compactRoutes);
  expect(Math.abs(spread.positions.CFTR.y - spread.positions.ductal.y)).toBeCloseTo(40);
  expect(spread.positions.CFTR.width).toBe(24.4);
  expect(spread.positions.CFTR.x).toBeCloseTo(51.8);
  expect(spread.routes.detected.source_port.y - spread.positions.CFTR.y).toBeCloseTo(-8);
  expect(spread.routes.detected.target_port.y - spread.positions.ductal.y).toBeCloseTo(8);
  const { nodes, edges, edgeStyles } = graphElements(compactGraph, compactPositions, compactRoutes, { spreadCompact: true });
  expect(nodes.map((node) => node.data.id)).toEqual(['CFTR', 'ductal', 'MUC5B']);
  expect(edges.map((edge) => [edge.data.source, edge.data.target])).toEqual([['CFTR', 'ductal'], ['CFTR', 'ductal']]);
  expect(edgeStyles.get('detected')['source-endpoint']).toBe('0px -8px');
  expect(edgeStyles.get('enriched')['control-point-distances'][0]).not.toBe(edgeStyles.get('detected')['control-point-distances'][0]);
  expect(edgeStyles.get('detected')['text-opacity']).toBe(1);
  const viewport = calculateGraphViewport(geometryBounds(spread.positions, spread.routes), { width: 600, height: 630 });
  expect(viewport.zoom).toBe(4);
  expect(6 * viewport.zoom).toBe(24); // Existing 6px node font, unchanged.
  expect(Math.abs(nodes[0].position.y - nodes[1].position.y) * viewport.zoom).toBeCloseTo(160);
  expect(JSON.stringify([compactGraph, compactPositions, compactRoutes])).toBe(original);
  expect(spreadCompactLayout(compactGraph, compactPositions, compactRoutes)).toEqual(spread);
});

test.each([25, 50, 100])('%i-node layouts retain positions/routes and fit panel and fullscreen, including curved route bounds', (count) => {
  const nodes = Array.from({ length: count }, (_, i) => ({ '~id': String(i) }));
  const coords = Object.fromEntries(nodes.map((node, i) => [node['~id'], { x: (i % 10) * 130, y: Math.floor(i / 10) * 90, width: 110, height: 16 }]));
  const curves = { wide: { control_points: [[-200, -150], [1400, 1100]] } };
  expect(spreadCompactLayout({ nodes, edges: [] }, coords, curves)).toEqual({ positions: coords, routes: curves });
  const bounds = geometryBounds(coords, curves);
  for (const size of [{ width: 600, height: 630 }, { width: 1440, height: 800 }]) {
    const viewport = calculateGraphViewport(bounds, size);
    expect(bounds.x1 * viewport.zoom + viewport.pan.x).toBeGreaterThanOrEqual(23.999);
    expect(bounds.x2 * viewport.zoom + viewport.pan.x).toBeLessThanOrEqual(size.width - 83.999);
    expect(bounds.y1 * viewport.zoom + viewport.pan.y).toBeGreaterThanOrEqual(23.999);
    expect(bounds.y2 * viewport.zoom + viewport.pan.y).toBeLessThanOrEqual(size.height - 75.999);
    expect(viewport.minZoom).toBeLessThan(viewport.zoom);
    expect(viewport.zoom).toBeLessThanOrEqual(4);
  }
  expect(calculateGraphViewport(bounds, { width: 600, height: 630 }).zoom).toBeLessThan(0.6);
});

test('already spread layouts and review coordinates remain unchanged', () => {
  expect(spreadCompactLayout(graph, positions, routes)).toEqual({ positions, routes });
  const { nodes } = graphElements(compactGraph, compactPositions, compactRoutes, { spreadCompact: true, review: true });
  expect(nodes[0].position).toEqual(compactPositions.CFTR);
});

test('viewport ignores hidden/invalid panels and caps a single-node fit at the existing maximum zoom', () => {
  expect(calculateGraphViewport({ x1: 0, y1: 0, x2: 20, y2: 16 }, { width: 0, height: 630 })).toBeNull();
  expect(calculateGraphViewport({ x1: NaN, y1: 0, x2: 20, y2: 16 }, { width: 600, height: 630 })).toBeNull();
  expect(calculateGraphViewport({ x1: 0, y1: 0, x2: 20, y2: 16 }, { width: 600, height: 630 }).zoom).toBe(4);
});

test('resize observer waits for visibility, refits real size changes, preserves user zoom on unchanged size, and cleans up', () => {
  let size = { width: 0, height: 0 }, callback, frame, destroyed = false, zoom = 1;
  const bounds = { x1: 0, y1: 0, x2: 1000, y2: 400 };
  const cy = { destroyed: () => destroyed, resize: jest.fn(), nodes: () => ({ length: 100 }),
    elements: () => ({ boundingBox: jest.fn(() => bounds) }), width: () => size.width, height: () => size.height,
    minZoom: jest.fn(), maxZoom: jest.fn(), viewport: jest.fn((view) => { zoom = view.zoom; }) };
  const disconnect = jest.fn();
  const host = { ResizeObserver: jest.fn(function Observer(fn) { callback = fn; this.observe = jest.fn(); this.disconnect = disconnect; }),
    requestAnimationFrame: jest.fn((fn) => { frame = fn; return 1; }), cancelAnimationFrame: jest.fn(),
    addEventListener: jest.fn(), removeEventListener: jest.fn() };
  const onFit = jest.fn();
  const controller = observeGraphViewport(cy, { getBoundingClientRect: () => size }, onFit, host);
  expect(cy.viewport).not.toHaveBeenCalled();
  frame();
  size = { width: 600, height: 630 }; callback(); callback(); frame();
  expect(onFit).toHaveBeenCalledTimes(1);
  expect(zoom).toBeCloseTo(0.492);
  zoom = 2; callback(); frame();
  expect(zoom).toBe(2);
  size = { width: 1440, height: 800 }; callback(); frame();
  expect(zoom).toBeCloseTo(1.332);
  size = { width: 600, height: 630 }; controller.fit();
  expect(zoom).toBeCloseTo(0.492);
  callback(); const lastFrame = frame; controller.dispose(); destroyed = true; lastFrame();
  expect(onFit).toHaveBeenCalledTimes(3);
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(host.cancelAnimationFrame).toHaveBeenCalledWith(1);
  expect(controller.fit()).toBeNull();
});
