const point = (value) => Array.isArray(value) ? { x: value[0], y: value[1] } : value;
const finitePoint = (value) => { const p = point(value); return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null; };

export function routeStyle(route, source, target, inverted = false) {
  if (!route || !source || !target) return undefined;
  const start = inverted ? target : source;
  const end = inverted ? source : target;
  const dx = end.x - start.x, dy = end.y - start.y;
  const squared = dx * dx + dy * dy, length = Math.sqrt(squared);
  if (!length) return undefined;
  let points = (route.control_points || route.waypoints || []).map(finitePoint).filter(Boolean);
  if (inverted) points = points.slice().reverse();
  const weights = points.map((p) => ((p.x - start.x) * dx + (p.y - start.y) * dy) / squared);
  const distances = points.map((p) => (dx * (p.y - start.y) - dy * (p.x - start.x)) / length);
  // An empty string removes a Cytoscape bypass instead of hiding the label.
  const style = route.label_visible === false ? { 'text-opacity': 0 } : {};
  if (points.length) {
    const polyline = route.route_type === 'polyline';
    style['curve-style'] = polyline ? 'segments' : 'unbundled-bezier';
    style[polyline ? 'segment-weights' : 'control-point-weights'] = weights;
    style[polyline ? 'segment-distances' : 'control-point-distances'] = distances;
    style['edge-distances'] = 'node-position';
  }
  const sourcePort = finitePoint(inverted ? route.target_port : route.source_port);
  const targetPort = finitePoint(inverted ? route.source_port : route.target_port);
  if (sourcePort) style['source-endpoint'] = `${sourcePort.x - start.x}px ${sourcePort.y - start.y}px`;
  if (targetPort) style['target-endpoint'] = `${targetPort.x - end.x}px ${targetPort.y - end.y}px`;
  return style;
}

export function graphElements(result, positions = {}, routes = {}, options = {}) {
  const { review = false, graphInfocard = {}, edgeIsInverted = {}, edgeLabels = {} } = options;
  const propertyKey = review ? 'properties' : '~properties';
  const unique = new Map((result?.nodes || []).map((node) => [node['~id'], node]));
  const nodes = [...unique.values()].map((node, index) => {
    const raw = node[propertyKey] || {};
    const labels = node['~labels'] || [];
    const type = review ? 'cell_type' : node.display_type || labels.find((label) => graphInfocard.nodes?.[label]?.info_panel) || 'coding_elements';
    const position = finitePoint(positions[node['~id']]) || { x: index * 36, y: 0 };
    const label = node.display_label || raw.name || raw.id || node['~id'];
    return { data: { ...raw, id: node['~id'], label: String(label).replace(/_/g, ' '), type, raw_labels: labels, Level: positions[node['~id']]?.Level || 'Core' }, position };
  });
  const byId = Object.fromEntries(nodes.map((node) => [node.data.id, node]));
  const edgeStyles = new Map();
  const edges = [...new Map((result?.edges || []).map((edge) => [edge['~id'], edge])).values()].filter((edge) => byId[edge['~start']] && byId[edge['~end']]).map((edge) => {
    const displayType = edge.display_type || edge['~type'];
    const inverted = Boolean(edgeIsInverted[displayType]);
    const start = edge['~start'], end = edge['~end'];
    const style = routeStyle(routes[edge['~id']], byId[start].position, byId[end].position, inverted);
    if (style) edgeStyles.set(edge['~id'], style);
    return { data: { ...(edge[propertyKey] || {}), id: edge['~id'], source: inverted ? end : start, target: inverted ? start : end,
      source_name: byId[start].data.label, target_name: byId[end].data.label, type: displayType, raw_type: edge['~type'],
      label: edge.display_label || edgeLabels[displayType] || String(displayType || '').replace(/_/g, ' ') } };
  });
  return { nodes, edges, edgeStyles };
}

export function applyGraphRoutes(cy, edgeStyles) {
  // Curve styles inspect parallel edges. Apply only after Cytoscape has attached
  // every endpoint; element-creation style bypasses run before that attachment.
  cy.batch(() => {
    edgeStyles.forEach((style, id) => {
      const edge = cy.getElementById(id);
      if (edge.nonempty() && edge.isEdge()) edge.style(style);
    });
  });
}
