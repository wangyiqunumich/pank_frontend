const EXPRESSION_EDGES = new Set(['GENE_DETECTED_IN', 'GENE_ENRICHED_IN', 'MARKER_GENE_OF']);
const CELL_ID = /^CL[_:]\d+(?:[_:]\w+)?$/;
const BORDER_COLORS = ['#219197', '#5b83ab'];

// Use one region per ontology ID. An existing Cell remains a clickable KG node.
export function cccCellLayout(graph, positions = {}) {
  const edges = graph?.edges || [];
  const cccEdges = edges.filter(edge => edge['~type'] === 'LIGAND_RECEPTOR');
  if (!cccEdges.length) return null;

  const nodes = new Map(graph.nodes.map(node => [node['~id'], node]));
  const cells = new Map();
  const assignments = new Map();
  for (const edge of cccEdges) {
    const context = edge.ccc_context;
    if (!context) continue;
    const endpoints = [
      [edge['~start'], context.sender_cell_id, context.sender_cell_name || context.source],
      [edge['~end'], context.receiver_cell_id, context.receiver_cell_name || context.target],
    ];
    for (const [nodeId, id, label] of endpoints) {
      if (!id || !label || !nodes.has(nodeId)) continue;
      if (!cells.has(id)) cells.set(id, {label, genes: []});
      if (!assignments.has(nodeId)) assignments.set(nodeId, new Set());
      assignments.get(nodeId).add(id);
    }
  }

  for (const [nodeId, matches] of assignments) {
    if (matches.size === 1) cells.get([...matches][0]).genes.push(nodeId);
  }
  for (const edge of edges) {
    if (!EXPRESSION_EDGES.has(edge['~type'])) continue;
    const id = edge['~end'];
    const node = nodes.get(id);
    if (!node || !CELL_ID.test(id)) continue;
    const label = node['~properties']?.name || node.display_label || id;
    if (!cells.has(id)) cells.set(id, {label, genes: []});
    cells.get(id).cellNode = id;
  }

  const xy = {};
  const regions = [];
  let right = 0;
  let bottom = 0;
  for (const [id, {label, genes, cellNode}] of cells) {
    if (!genes.length && !cellNode) continue;
    const pair = genes.length > 0 && cellNode;
    const width = Math.max(82, Math.min(3, genes.length) * 42 + 14, Math.min(110, label.length * 2.5 + 22));
    const geneRows = Math.ceil(genes.length / 3);
    const cellY = pair ? (geneRows - 1) * 24 + 36 : 0;
    const lastY = pair ? cellY : Math.max(0, geneRows - 1) * 24;
    const height = lastY + 42;
    const x = right + width / 2;
    right += width + 38;
    bottom = Math.max(bottom, lastY + 21);
    genes.forEach((node, i) => {
      const columns = Math.min(3, genes.length - Math.floor(i / 3) * 3);
      xy[node] = {...positions[node], x: x + (i % 3 - (columns - 1) / 2) * 42, y: Math.floor(i / 3) * 24};
    });
    if (cellNode) xy[cellNode] = {...positions[cellNode], x, y: cellY};
    const border = BORDER_COLORS[regions.length % BORDER_COLORS.length];
    // The semantic Cell node already carries the ontology label.
    regions.push({id, label: cellNode ? '' : label, x, y: lastY / 2, width, height, border});
  }
  if (!regions.length) return null;

  const otherNodes = [...nodes.keys()].filter(id => !(id in xy));
  if (otherNodes.length) {
    const points = otherNodes.map((id, index) => {
      const value = positions[id];
      const x = Array.isArray(value) ? value[0] : value?.x;
      const y = Array.isArray(value) ? value[1] : value?.y;
      return {id, x: Number.isFinite(x) ? x : index * 42, y: Number.isFinite(y) ? y : 0};
    });
    const top = Math.min(...points.map(point => point.y));
    const left = Math.min(...points.map(point => point.x));
    for (const point of points) {
      xy[point.id] = {...positions[point.id], x: point.x - left + 30, y: point.y - top + bottom + 38};
    }
  }
  return {xy, layout: {mode: 'cell_type_mode', cell_regions: regions}};
}
