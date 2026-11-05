import schema from './schema/result_page_schema.json';
export const QTL_CONFIG = schema.main_visuals.items.qtl_fine_mapping;
const text = value => typeof value === 'string' ? value.trim() : '';
const properties = value => value?.['~properties'] || value?.properties || {};
export const qtlEdges = graph => (graph?.edges || []).filter(edge => QTL_CONFIG.kg_relation_types.some(type => type.toLowerCase() === text(edge['~type'] || edge.type).toLowerCase()));
const genesFallback = set => /^ENSG\d{11}(?:\.\d+)?__([A-Za-z0-9-]+)__/.exec(set)?.[1] || '';
export function qtlContexts(result) {
  const graph = result?.combined_query_result;
  const groups = result?.resources?.resource_groups || result?.resource_groups || [];
  const seen = new Set();
  return qtlEdges(graph).map(edge => {
    const props = properties(edge);
    const credibleSet = text(props.credible_set_id || props.credible_set);
    const conflictingSet = props.credible_set_id && props.credible_set && props.credible_set_id !== props.credible_set;
    const dataSource = text(props.data_source);
    const sourceUrl = text(props.data_source_url).replace(/\/$/, '');
    const source = QTL_CONFIG.sources.find(item => item.source_url.replace(/\/$/, '') === sourceUrl || (!sourceUrl && item.dataset_id === text(props.source_id)));
    const conflictingSource = source && props.source_id && props.source_id !== source.dataset_id;
    const validSet = /^[A-Za-z0-9_.:-]{1,600}$/.test(credibleSet);
    const endpoints = [edge['~start'] || edge.start_id || edge.source, edge['~end'] || edge.end_id || edge.target];
    const geneNodes = (graph?.nodes || []).filter(node => endpoints.includes(node['~id'] || node.id));
    const geneNode = geneNodes.find(node => [node['~id'], node.id, properties(node).id, properties(node).Ensembl_ID].some(id => /^ENSG\d{11}/.test(id || '')));
    const geneLabel = text(properties(geneNode).HGNC_symbol || properties(geneNode).name) || genesFallback(credibleSet);
    const genes = (graph?.nodes || []).filter(node => endpoints.includes(node['~id'] || node.id)).flatMap(node => [node['~id'], node.id, properties(node).id, properties(node).Ensembl_ID]).filter(id => /^ENSG\d{11}(?:\.\d+)?$/.test(id || ''));
    const geneMismatch = credibleSet.startsWith('ENSG') && genes.length && !genes.some(gene => credibleSet.split('__')[0].split('.')[0] === gene.split('.')[0]);
    const available = Boolean(source && validSet && !geneMismatch && !conflictingSet && !conflictingSource);
    const key = available ? `${source.folder}/${credibleSet}` : text(edge['~id'] || edge.id);
    const group = groups.find(group => group.credible_set === credibleSet && (group.data_source_url === source?.source_url || group.source === source?.dataset_id || group.folder === source?.folder));
    return { key, edgeId: text(edge['~id'] || edge.id), credibleSet, dataSource, sourceId:source?.dataset_id, sourceUrl:source?.source_url, sourceLabel: source?.label || dataSource, geneLabel, available,
      downloadUrl: available ? `${QTL_CONFIG.download_origin}/${source.folder}/${encodeURIComponent(credibleSet)}.txt` : '',
      context: group?.context || Object.fromEntries(QTL_CONFIG.context_fields.filter(field => props[field]).map(field => [field, props[field]])),
      reason: !source || conflictingSource ? 'unsupported_source' : conflictingSet ? 'missing_credible_set' : !validSet ? 'missing_credible_set' : geneMismatch ? 'gene_mismatch' : null };
  }).filter(context => { if (seen.has(context.key)) return false; seen.add(context.key); return true; });
}
// Remove only the superseded QTL plot, leaving other empirical sources intact.
export function isQtlEmpirical(entry, contexts) {
  return contexts.some(context => context.available && context.credibleSet === entry?.credible_set &&
    (context.sourceUrl === entry.data_source_url || context.sourceId === entry.source_id || context.key === `${entry.folder}/${entry.credible_set}`));
}
