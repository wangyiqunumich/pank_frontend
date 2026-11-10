import { displayWords } from './recordedPresentation';
import { samplePresentation } from './samplePresentation';
const point = (value) => Array.isArray(value) ? { x: value[0], y: value[1] } : value;
const finitePoint = (value) => { const p = point(value); return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null; };

// The server's compact layout uses the same 6px text scale as the old viewer.
// Give small graphs breathing room without changing node sizes, graph topology,
// or the optimized relative positions of larger graphs. Route endpoints retain
// their original offset from their node; scaling that offset would detach them.
export function spreadCompactLayout(result, positions = {}, routes = {}) {
  const ids = [...new Set((result?.nodes || []).map((node) => node['~id']))];
  if (ids.length < 2 || ids.length > 8 || ids.some((id) => !finitePoint(positions[id]))) return { positions, routes };
  positions = Object.fromEntries(ids.map(id => [id, { ...positions[id], ...finitePoint(positions[id]) }]));
  let factor = 1;
  const dimension = (p, key) => Number.isFinite(p[key]) && p[key] > 0 ? p[key] : key === 'width' ? 40 : 16;
  ids.forEach((id, index) => ids.slice(index + 1).forEach((other) => {
    const a = positions[id], b = positions[other];
    const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
    if (dx + dy === 0) return;
    const sx = dx ? ((dimension(a, 'width') + dimension(b, 'width')) / 2 + 24) / dx : Infinity;
    const sy = dy ? ((dimension(a, 'height') + dimension(b, 'height')) / 2 + 24) / dy : Infinity;
    factor = Math.max(factor, Math.min(sx, sy));
  }));
  factor = Math.min(factor, 2.5);
  if (factor === 1) return { positions, routes };
  const center = { x: ids.reduce((sum, id) => sum + positions[id].x, 0) / ids.length,
    y: ids.reduce((sum, id) => sum + positions[id].y, 0) / ids.length };
  const transform = (value) => {
    const p = finitePoint(value);
    return p ? { x: center.x + (p.x - center.x) * factor, y: center.y + (p.y - center.y) * factor } : value;
  };
  const moved = Object.fromEntries(ids.map((id) => [id, { ...positions[id], ...transform(positions[id]) }]));
  const anchor = (value, id) => {
    const p = finitePoint(value);
    return p && moved[id] ? { x: moved[id].x + p.x - positions[id].x, y: moved[id].y + p.y - positions[id].y } : value;
  };
  const byId = Object.fromEntries((result.edges || []).map((edge) => [edge['~id'], edge]));
  const movedRoutes = Object.fromEntries(Object.entries(routes).map(([id, route]) => {
    const edge = byId[id];
    if (!edge || !route) return [id, route];
    return [id, { ...route,
      source_port: anchor(route.source_port, edge['~start']), target_port: anchor(route.target_port, edge['~end']),
      ...(route.control_points ? { control_points: route.control_points.map(transform) } : {}),
      ...(route.waypoints ? { waypoints: route.waypoints.map(transform) } : {}),
    }];
  }));
  return { positions: moved, routes: movedRoutes };
}

export function calculateGraphViewport(bounds, size) {
  if (!bounds || ![size?.width, size?.height].every((n) => Number.isFinite(n) && n > 0)
    || ![bounds.x1, bounds.y1, bounds.x2, bounds.y2].every(Number.isFinite)) return null;
  // Reserve the existing controls and collapsed legend, not just the pane edge.
  const insetScale = Math.min(1, size.width / 320, size.height / 240);
  const left = 24 * insetScale, right = 84 * insetScale, top = 64 * insetScale, bottom = 76 * insetScale;
  const width = size.width - left - right, height = size.height - top - bottom;
  const zoom = Math.min(4, width / Math.max(1, bounds.x2 - bounds.x1), height / Math.max(1, bounds.y2 - bounds.y1));
  return { zoom, minZoom: Math.min(0.6, zoom / 2), maxZoom: 4,
    pan: { x: left + width / 2 - zoom * (bounds.x1 + bounds.x2) / 2,
      y: top + height / 2 - zoom * (bounds.y1 + bounds.y2) / 2 } };
}

export function fitGraphViewport(cy, listMode = false) {
  if (cy.destroyed()) return null;
  cy.resize();
  if (!cy.nodes().length) return null;
  const viewport = calculateGraphViewport(cy.elements().boundingBox({ includeLabels: true, includeOverlays: false }),
    { width: cy.width(), height: cy.height() });
  if (!viewport) return null;
  // List-specific top alignment is not needed anymore: centered XY uses native fit.
  cy.minZoom(viewport.minZoom);
  cy.maxZoom(viewport.maxZoom);
  cy.viewport({ zoom: viewport.zoom, pan: viewport.pan });
  return viewport;
}

export function observeGraphViewport(cy, container, onFit = () => {}, host = window, listMode = false) {
  let disposed = false, frame = null, lastSize = null, fittedCamera = null;
  const fit = () => {
    if (disposed || cy.destroyed()) return null;
    const box = container.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    const viewport = fitGraphViewport(cy, listMode);
    if (viewport) { lastSize = { width: box.width, height: box.height }; fittedCamera = { zoom: viewport.zoom, pan: viewport.pan }; onFit(viewport); }
    return viewport;
  };
  const stillFitted = () => {
    const pan = cy.pan();
    return fittedCamera && Math.abs(cy.zoom() - fittedCamera.zoom) < 1e-6
      && Math.abs(pan.x - fittedCamera.pan.x) < 1e-6 && Math.abs(pan.y - fittedCamera.pan.y) < 1e-6;
  };
  const schedule = () => {
    if (disposed || frame !== null) return;
    frame = host.requestAnimationFrame(() => {
      frame = null;
      if (disposed || cy.destroyed()) return;
      const box = container.getBoundingClientRect();
      // Hidden visual tabs must not replace the last visible camera geometry.
      if (box.width <= 0 || box.height <= 0) return;
      if (box.width !== lastSize?.width || box.height !== lastSize?.height) {
        // A shorter fullscreen window must not crop the initial fitted graph.
        // Once the user changes the camera, retain their chosen view instead.
        if (!lastSize || stillFitted()) fit();
        else {
          cy.resize();
          // Resize the viewport around its model-space center, not its top-left.
          // This preserves user zoom/pan through fullscreen and back, without
          // refitting the graph or resetting dragged nodes and selections.
          cy.panBy({ x: (box.width - lastSize.width) / 2, y: (box.height - lastSize.height) / 2 });
          lastSize = { width: box.width, height: box.height };
        }
      }
    });
  };
  const observer = host.ResizeObserver ? new host.ResizeObserver(schedule) : null;
  observer?.observe(container);
  host.addEventListener('resize', schedule);
  // Wheel interception and disabled zoom are not needed anymore. Keep native controls.

  fit();
  schedule();
  return { fit, refreshLayout() { if (!lastSize || stillFitted()) fit(); }, dispose() {
    disposed = true;
    observer?.disconnect();
    host.removeEventListener('resize', schedule);
    if (frame !== null) host.cancelAnimationFrame(frame);
  } };
}

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
  // Route label visibility is advisory: displayed relationships always retain
  // their label as an evidence-inspection target in this viewer.
  const style = {};
  if (points.length) {
    const polyline = route.route_type === 'polyline';
    style['curve-style'] = polyline ? 'segments' : 'unbundled-bezier';
    style[polyline ? 'segment-weights' : 'control-point-weights'] = weights;
    style[polyline ? 'segment-distances' : 'control-point-distances'] = distances;
    style['edge-distances'] = 'node-position';
  }
  const sourcePort = finitePoint(inverted ? route.target_port : route.source_port);
  const targetPort = finitePoint(inverted ? route.source_port : route.target_port);
  const offset = (value) => Math.round(value * 1e6) / 1e6;
  if (sourcePort) style['source-endpoint'] = `${offset(sourcePort.x - start.x)}px ${offset(sourcePort.y - start.y)}px`;
  if (targetPort) style['target-endpoint'] = `${offset(targetPort.x - end.x)}px ${offset(targetPort.y - end.y)}px`;
  if (route.list_leaf_endpoint) {
    let endpoint = route.list_leaf_endpoint;
    if (inverted) endpoint = endpoint === 'source' ? 'target' : 'source';
    style.label = '';
    style[endpoint + '-label'] = 'data(label)';
    style[endpoint + '-text-offset'] = 30;
    style[endpoint + '-text-rotation'] = 'none';
  }
  return style;
}

export function graphElements(result, positions = {}, routes = {}, options = {}) {
  const { review = false, graphInfocard = {}, edgeIsInverted = {}, edgeLabels = {}, spreadCompact = false } = options;
  if (spreadCompact && !review) ({ positions, routes } = spreadCompactLayout(result, positions, routes));
  const propertyKey = review ? 'properties' : '~properties';
  const unique = new Map((result?.nodes || []).map((node) => [node['~id'], node]));
  const nodes = [...unique.values()].map((node, index) => {
    const raw = node[propertyKey] || {};
    const labels = node['~labels'] || [];
    // Backend profile names (e.g. Gene/Cell) are evidence identities, not
    // necessarily registered frontend style keys. Keep typed refs unchanged.
    const displayType = graphInfocard.nodes?.[node.display_type] ? node.display_type : null;
    const type = review ? 'cell_type' : (labels.includes('provenance') ? 'provenance' : displayType) || labels.find((label) => graphInfocard.nodes?.[label]?.info_panel) || 'coding_elements';
    const position = finitePoint(positions[node['~id']]) || { x: index * 36, y: 0 };
    const sample = review ? {} : samplePresentation(node, result);
    const label = node.list_label || (labels.includes('provenance') ? 'Metadata definition' : sample.sample_display_label || raw.name || node.display_label || raw.id || node['~id']);
    return { data: { ...raw, ...sample, evidence_properties: { ...raw }, element_kind: 'node', viewer_ref: node.ref ? { ...node.ref } : null, id: node['~id'], label: displayWords(label).length > 55 ? displayWords(label).slice(0, 52) + '…' : displayWords(label), type, raw_labels: labels, Level: positions[node['~id']]?.Level || 'Core' }, position: { ...position } };
  });
  const byId = Object.fromEntries(nodes.map((node) => [node.data.id, node]));
  const edgeStyles = new Map();
  const edges = [...new Map((result?.edges || []).map((edge) => [edge['~id'], edge])).values()].filter((edge) => byId[edge['~start']] && byId[edge['~end']]).map((edge) => {
    const displayType = edge.display_type || edge['~type'];
    const label = [edge.display_label, edgeLabels[displayType], displayType, edge['~type']]
      .find((value) => typeof value === 'string' && value.trim()) || 'Relationship';
    const inverted = Boolean(edgeIsInverted[displayType]);
    const start = edge['~start'], end = edge['~end'];
    const style = routeStyle(routes[edge['~id']], byId[start].position, byId[end].position, inverted);
    edgeStyles.set(edge['~id'], { ...style, 'text-opacity': 1, 'text-events': 'yes' });
    return { data: { ...(edge[propertyKey] || {}), element_kind: 'edge', viewer_ref: edge.ref ? { ...edge.ref } : null, id: edge['~id'], source: inverted ? end : start, target: inverted ? start : end,
      source_name: byId[start].data.label, target_name: byId[end].data.label, type: displayType, raw_type: edge['~type'],
      label: label.replace(/_/g, ' ').trim(),
      evidence_properties: { ...(edge[propertyKey] || {}) } } };
  });
  // Parallel relationships share a midpoint. Separate their label baselines
  // deterministically so each remains a distinct hover target, without moving
  // nodes, routes or endpoint attachments.
  const parallel = new Map();
  edges.forEach((edge) => {
    const key = JSON.stringify([edge.data.source, edge.data.target].sort());
    if (!parallel.has(key)) parallel.set(key, []);
    parallel.get(key).push(edge);
  });
  parallel.forEach((group) => {
    if (group.length < 2) return;
    group.sort((a, b) => String(a.data.id).localeCompare(String(b.data.id)));
    group.forEach((edge, index) => {
      edgeStyles.get(edge.data.id)['text-margin-y'] = (index - (group.length - 1) / 2) * 8;
    });
  });
  // Cytoscape mutates the position object in its element definitions on drag.
  const modelPositions = new Map(nodes.map(({ data, position: { x, y } }) => [data.id, { x, y }]));
  return { nodes, edges, edgeStyles, modelPositions };
}

export function applyGraphRoutes(cy, edgeStyles, previousStyles = new Map(), movedNodes = new Set()) {
  // Curve styles inspect parallel edges. Apply only after Cytoscape has attached
  // every endpoint; element-creation style bypasses run before that attachment.
  cy.batch(() => {
    edgeStyles.forEach((style, id) => {
      const edge = cy.getElementById(id);
      if (edge.empty() || !edge.isEdge()) return;
      const previous = previousStyles.get(id) || {};
      const moved = movedNodes.has(edge.data('source')) || movedNodes.has(edge.data('target'));
      const next = moved ? Object.fromEntries(Object.entries(style).filter(([key]) => !ROUTE_GEOMETRY.has(key))) : style;
      const stale = Object.keys(previous).filter(key => !(key in next));
      if (stale.length) edge.removeStyle(stale.join(' '));
      edge.style(next);
    });
  });
}


const ROUTE_GEOMETRY = new Set(['curve-style', 'control-point-weights', 'control-point-distances',
  'segment-weights', 'segment-distances', 'source-endpoint', 'target-endpoint', 'edge-distances']);
const samePosition = (a, b) => a.x === b.x && a.y === b.y;

export function updateGraphElements(cy, next, previous) {
  const { nodes, edges, edgeStyles, modelPositions } = next;
  const desired = new Set([...nodes, ...edges].map(element => element.data.id));
  const movedNodes = new Set();
  const routesChanged = [...edgeStyles].some(([id, style]) => JSON.stringify(previous.edgeStyles.get(id)) !== JSON.stringify(style));
  let layoutChanged = false;
  cy.batch(() => {
    const obsolete = cy.elements().filter(element => !desired.has(element.id()));
    // Move any retained edges before removing old endpoints.
    nodes.forEach(node => {
      const existing = cy.getElementById(node.data.id);
      if (existing.empty()) {
        cy.add(node);
        layoutChanged = true;
        return;
      }
      const baseline = previous.modelPositions.get(node.data.id);
      if (baseline && !samePosition(existing.position(), baseline)) movedNodes.add(node.data.id);
      else if (!samePosition(existing.position(), modelPositions.get(node.data.id))) {
        existing.position(modelPositions.get(node.data.id));
        layoutChanged = true;
      }
      existing.data(node.data);
    });
    edges.forEach(edge => {
      const { id, source, target } = edge.data;
      const existing = cy.getElementById(id);
      if (existing.empty()) {
        cy.add(edge);
        layoutChanged = true;
      } else {
        if (existing.data('source') !== source || existing.data('target') !== target) {
          existing.move({ source, target });
          layoutChanged = true;
        }
        existing.data(edge.data);
      }
    });
    if (obsolete.nonempty()) {
      obsolete.remove();
      layoutChanged = true;
    }
    if (layoutChanged || routesChanged) applyGraphRoutes(cy, edgeStyles, previous.edgeStyles, movedNodes);
  });
  return layoutChanged || routesChanged;
}
