import schema from './schema/result_page_schema.json';
export const QTL_CONFIG = schema.main_visuals.items.qtl_fine_mapping;
const text = value => typeof value === 'string' ? value.trim() : '';
const properties = value => value?.['~properties'] || value?.properties || {};
export const qtlEdges = graph => (graph?.edges || []).filter(edge => QTL_CONFIG.kg_relation_types.some(type => type.toLowerCase() === text(edge['~type'] || edge.type).toLowerCase()));
export function qtlContexts(result) {
  const graph = result?.combined_query_result;
  const groups = result?.resources?.resource_groups || result?.resource_groups || [];
  const seen = new Set();
  return qtlEdges(graph).map(edge => {
    const props = properties(edge);
    const credibleSet = text(props.credible_set || props.credibleset || props.credible_set_id);
    const dataSource = text(props.data_source);
    const source = QTL_CONFIG.sources.find(source => source.aliases.includes(dataSource));
    const validSet = /^[A-Za-z0-9_.:-]{1,600}$/.test(credibleSet);
    const endpoints = [edge['~start'] || edge.start_id || edge.source, edge['~end'] || edge.end_id || edge.target];
    const genes = (graph?.nodes || []).filter(node => endpoints.includes(node['~id'] || node.id)).flatMap(node => [node['~id'], node.id, properties(node).id, properties(node).Ensembl_ID]).filter(id => /^ENSG\d{11}(?:\.\d+)?$/.test(id || ''));
    const geneMismatch = credibleSet.startsWith('ENSG') && genes.length && !genes.some(gene => credibleSet.split('__')[0].split('.')[0] === gene.split('.')[0]);
    const available = Boolean(source && validSet && !geneMismatch);
    const key = available ? `${source.folder}/${credibleSet}` : text(edge['~id'] || edge.id);
    const group = groups.find(group => group.credible_set === credibleSet && (group.data_source === dataSource || group.source === source?.key));
    return { key, edgeId: text(edge['~id'] || edge.id), credibleSet, dataSource, sourceLabel: source?.label || dataSource, available,
      downloadUrl: available ? `${QTL_CONFIG.download_origin}/${source.folder}/${encodeURIComponent(credibleSet)}.txt` : '',
      context: group?.context || Object.fromEntries(QTL_CONFIG.context_fields.filter(field => props[field]).map(field => [field, props[field]])),
      reason: !source ? 'unsupported_source' : !validSet ? 'missing_credible_set' : geneMismatch ? 'gene_mismatch' : null };
  }).filter(context => { if (seen.has(context.key)) return false; seen.add(context.key); return true; });
}
// Remove only the superseded QTL plot, leaving other empirical sources intact.
export function isQtlEmpirical(entry, contexts) {
  return contexts.some(context => context.available && context.credibleSet === entry?.credible_set &&
    (context.dataSource === entry.data_source || context.key === `${entry.folder}/${entry.credible_set}`));
}
