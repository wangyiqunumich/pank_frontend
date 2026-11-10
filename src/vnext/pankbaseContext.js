import schema from './schema/activeResultPage';

const text = value => typeof value === 'string' ? value.trim().slice(0, 500) : '';
const list = value => Array.isArray(value) ? value : [];
export const recordId = record => text(record?.['~id'] || record?.id);
const props = record => record?.['~properties'] || record?.properties || {};
const type = value => text(value).toLowerCase();
const labels = node => list(node?.['~labels'] || node?.labels).map(type);
const edgeType = edge => type(edge?.['~type'] || edge?.raw_type || edge?.type);
const symbol = node => {
  const p = props(node);
  const value = text(p.HGNC_symbol || p.gene_symbol || p.symbol || p.name);
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value) && !/^ENSG\d/.test(value) ? value : '';
};
const isGene = node => labels(node).some(label => ['gene', 'hgnc_symbol'].includes(label));

// Graph coordinates are accepted only with an explicit assembly and convention.
function graphLocus(p) {
  const chromosome = text(p.chromosome || p.chr).replace(/^chr/i, '');
  const start = Number(p.start_loc ?? p.start), end = Number(p.end_loc ?? p.end);
  const convention = text(p.coordinate_system);
  if (!['GRCh38', 'hg38'].includes(text(p.genome_build || p.assembly)) ||
      !/^(?:[1-9]|1[0-9]|2[0-2]|X|Y|M|MT)$/.test(chromosome) ||
      !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start ||
      !['0-based-half-open', '1-based-inclusive'].includes(convention) ||
      start < (convention === '1-based-inclusive' ? 1 : 0)) return null;
  return { chromosome, start: convention === '1-based-inclusive' ? start - 1 : start, end, genomeBuild: 'GRCh38' };
}

// A pure registry projection: never infer module intent from answer text or labels.
// Resource identity is distinct from the graph record that made it relevant.
export function pankbaseContexts(graph, selectedId) {
  const nodes = list(graph?.nodes), edges = list(graph?.edges);
  const byId = new Map(nodes.map(node => [recordId(node), node]));
  const definitions = schema.main_visuals.items;
  const contexts = {};
  for (const [moduleId, definition] of Object.entries(definitions)) {
    const trigger = definition.pankbase_trigger;
    if (!trigger || definition.enabled === false || definition.hidden) continue;
    const matches = [];
    for (const edge of edges) {
      if (!trigger.edge_types.map(type).includes(edgeType(edge))) continue;
      const endpoints = [edge['~start'] || edge.source, edge['~end'] || edge.target].map(id => byId.get(id)).filter(Boolean);
      const gene = endpoints.find(isGene);
      if (trigger.require_gene && !symbol(gene)) continue;
      matches.push({ record: edge, gene, node: endpoints.find(node => node !== gene) });
    }
    for (const node of nodes) {
      if (!labels(node).some(label => trigger.node_types.map(type).includes(label))) continue;
      const gene = isGene(node) ? node : undefined;
      if (trigger.require_gene && !symbol(gene)) continue;
      matches.push({ record: node, gene, node });
    }
    const match = matches.find(item => recordId(item.record) === selectedId) || matches[0];
    if (!match) continue;
    const p = props(match.record), n = props(match.node), g = props(match.gene);
    contexts[moduleId] = {
      moduleId, recordId: recordId(match.record), geneSymbol: symbol(match.gene),
      geneId: recordId(match.gene), cellType: text(p.cell_type_label || p.cell_type || n.cell_type_label || n.cell_type || (!isGene(match.node) && n.name)),
      datasetId: text(p.dataset_id || p.datasetId), comparison: text(p.comparison || p.contrast),
      source: text(p.data_source || p.source), release: text(p.data_version || p.release),
      condition: text(p.condition || p.disease), assay: text(p.assay || p.data_modality),
      locus: graphLocus(g),
      genomeBuild: text(g.genome_build || g.assembly || p.genome_build || p.assembly),
      relationship: edgeType(match.record), available: true, match: 'related',
    };
  }
  return contexts;
}

export function pankbaseUrl(moduleId, context) {
  const target = schema.main_visuals.items[moduleId]?.pankbase_resource;
  if (!target) return '';
  const url = new URL(target.url);
  if (context?.geneSymbol && target.gene_parameter) url.searchParams.set(target.gene_parameter, context.geneSymbol);
  return url.toString();
}
