import cytoscape from 'cytoscape';
import { applyGraphRoutes, graphElements } from './graphBindings';

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
    expect(enrichment.style('text-opacity')).toBe('0');
    expect(enrichment.style('label')).toBe('enrichment');
    expect(detection.style('curve-style')).toBe('segments');
    expect(detection.style('segment-distances')).toBe('-20px -20px');
    expect(detection.style('label')).toBe('detection');
    expect(cy.getElementById('unrouted').style('curve-style')).toBe('bezier');
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
