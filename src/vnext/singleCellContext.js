// Browser targets are explicitly registered, never inferred from arbitrary URLs.
export const SC_PROTOCOL = 'pankgraph.scbrowser.v1';
export const SC_DATASET = 'islet_of_Langerhans_scRNA_v3-4';
export const SC_RELATIONS = {
  gene_detected_in: 'Detection', gene_enriched_in: 'Enrichment', T1D_DEG_in: 'Differential expression',
  express_in: 'Expression', expressed_in: 'Expression', marker_gene_of: 'Marker annotation',
  HuBMAP_marker_gene_of: 'Marker annotation', gene_activity_score_in: 'ATAC gene activity',
};
const text = value => typeof value === 'string' ? value.trim().slice(0, 500) : '';
const props = item => item?.['~properties'] || item?.properties || {};
const id = item => text(item?.['~id'] || item?.id);
export const expressionEdges = graph => (graph?.edges || []).filter(edge => SC_RELATIONS[edge['~type'] || edge.type]);
const CELLS = ['Ductal', 'Active Stellate', 'Alpha', 'Acinar', 'MUC5B+ Ductal', 'Beta', 'Endothelial', 'Gamma + Epsilon', 'Delta', 'Immune', 'Quiescent Stellate', 'Cycling Alpha'];
export function cellLabel(value) {
  const normal = text(value).toLowerCase().replace(/[_-]/g, ' ').replace(/ cells?$/, '').trim();
  return CELLS.find(label => label.toLowerCase() === normal) || null;
}
export function expressionContext(graph, edgeId) {
  const edge = (graph?.edges || []).find(item => id(item) === edgeId);
  const relation = edge?.['~type'] || edge?.type;
  if (!SC_RELATIONS[relation]) return null;
  const p = props(edge);
  const nodes = (graph.nodes || []).filter(n => [edge['~start'] || edge.source, edge['~end'] || edge.target].includes(id(n)));
  const gene = nodes.find(n => /gene/i.test((n['~labels'] || n.labels || []).join(' ')) || /^ENSG/.test(id(n)) || props(n).gene_symbol || props(n).HGNC_symbol);
  const cell = nodes.find(n => n !== gene);
  const geneSymbol = text(p.gene_symbol || props(gene).gene_symbol || props(gene).symbol || props(gene).HGNC_symbol || props(gene).name);
  const cellType = text(p.cell_type_label || p.cell_type || props(cell).cell_type_label || props(cell).cell_type || props(cell).name);
  const source = text(p.source_url || p.data_source);
  let recordedDataset = text(p.dataset_id || p.datasetId);
  if (!recordedDataset && source) {
    try {
      const url = new URL(source);
      if (['pankbase.org', 'www.pankbase.org', 'dev.pankbase.org'].includes(url.hostname)) {
        recordedDataset = url.searchParams.get('datasetId') || url.searchParams.get('PKBdatasetId') || '';
      }
    } catch (_) { /* No recorded dataset URL. */ }
  }
  const atac = relation === 'gene_activity_score_in' || /atac/i.test(text(p.assay || p.data_modality));
  const validGene = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(geneSymbol);
  const available = !atac && validGene && (!recordedDataset || recordedDataset === SC_DATASET);
  // Dataset identity alone cannot establish cohort / analysis equivalence.
  const match = available ? 'related' : 'unavailable';
  const datasetId = recordedDataset || SC_DATASET;
  const reason = atac ? 'ATAC gene activity is not scRNA expression.' : !validGene ? 'No unambiguous gene symbol is recorded.'
    : recordedDataset && recordedDataset !== SC_DATASET ? `The recorded dataset ${recordedDataset} is not registered in this browser. No replacement was selected.`
      : 'Related atlas context; the edge analysis and cohort have not been verified as an exact match.';
  return { version: 1, edgeId, relation, evidenceLabel: SC_RELATIONS[relation], geneId: id(gene), geneSymbol,
    cellType, mappedCellType: cellLabel(cellType), assay: atac ? 'snATAC-seq' : 'scRNA-seq', datasetId,
    release: datasetId === SC_DATASET ? 'v3.4' : 'Unverified', edgeRelease: text(p.data_version || p.release),
    condition: text(p.condition), match, available, reason,
    sourceUrl: /^https:\/\//.test(source) ? source : '',
    browserUrl: `https://pankbase.org/single-cell.html?datasetId=${encodeURIComponent(datasetId)}&gene=${encodeURIComponent(geneSymbol)}`,
    preview: ['median_donor_CPM', 'median_donor_logCPM', 'median_pct_cells_expressing', 'log2FoldChange', 'padj']
      .filter(key => p[key] !== undefined && p[key] !== null && ['string', 'number'].includes(typeof p[key]))
      .map(key => ({ label: key, value: String(p[key]).slice(0, 100) })),
  };
}
export function validBrowserContext(value) {
  return value?.version === 1 && value.available === true && value.assay === 'scRNA-seq'
    && value.datasetId === SC_DATASET && typeof value.edgeId === 'string'
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value.geneSymbol)
    && (value.mappedCellType === null || CELLS.includes(value.mappedCellType));
}

export function firstAvailableExpression(graph) {
  return expressionEdges(graph).map(edge => expressionContext(graph, edge['~id'] || edge.id)).find(context => context?.available) || null;
}
