import React from 'react';
import { render, screen } from '@testing-library/react';
import { edgeInfocardModel, InfocardMenu } from '../components/KnowledgeGraph';
import graphSchema from '../schema/graph_viewer_schema.json';

const props = { gene_symbol: 'CFTR', cell_type_label: 'Ductal', condition: 'ND', comparison: 'one_vs_rest',
  log2_fold_change: 7.62294179320318, median_donor_log_cpm: 10.5209895291038, median_donor_cpm: 1468.37765884335,
  pvalue: 4.22546526875228e-199, padj: 2.70070612652302e-195, rank_in_cell_type: 0,
  total_cells: 33686, expression_support_match: 'exact', expression_support_rule: 'logCPM_gt_threshold AND pct_expressed_gt_threshold',
  expression_source_file: 'all_donors_per_celltype_logCPM.csv', deg_source_file: 'Ductal_marker_genes_deseq.tsv',
  data_source: 'https://hugeampkpncms.org/sites/default/files/images/pankbase/methods/DE_methods.pdf', data_version: '2026-04-01',
  flagged: false, missing_measurement: null, nested_provenance: { method: 'observed', sources: ['A', 'B'] } };
const edge = { ...props, id: 'e1', source: 'CFTR', target: 'ductal', type: 'gene_enriched_in', raw_type: 'GENE_ENRICHED_IN', evidence_properties: props };

test('current lowercase CFTR measurements populate curated aliases without changing source properties', () => {
  const before = JSON.stringify(edge);
  const model = edgeInfocardModel(edge, graphSchema.edges.gene_enriched_in.info_panel);
  expect(model.data.log2FoldChange).toBe(props.log2_fold_change);
  expect(model.data.median_donor_logCPM).toBe(props.median_donor_log_cpm);
  expect(model.data.median_donor_CPM).toBe(props.median_donor_cpm);
  expect(model.rawProperties).toEqual(props);
  expect(model.schema.find(([title]) => title === 'Graph evidence properties')[1].map(([, key]) => key)).toEqual(Object.keys(props).sort());
  expect(JSON.stringify(edge)).toBe(before);
});

test('edge popup prioritizes readable measurements, retains exact values in hints and omits processing fields', () => {
  const { container } = render(<InfocardMenu hoveredData={edge} />);
  expect(screen.getByText('7.623')).toBeTruthy();
  expect(screen.getByText('Key evidence')).toBeTruthy();
  Object.entries(props).forEach(([key, value]) => {
    const row = container.querySelector(`[data-field="${key}"]`);
    if (['expression_support_match','expression_support_rule'].includes(key)) { expect(row).toBeNull(); return; }
    expect(row.getAttribute('title')).toContain(typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value));
  });
  expect(container.querySelector('[data-field="log2_fold_change"]').textContent).toContain('7.623');
  expect(container.querySelector('[data-field="pvalue"]').textContent).toContain('4.23 × 10⁻¹⁹⁹');
  expect(container.querySelector('[data-field="data_source"] a').getAttribute('href')).toBe(props.data_source);
  expect(screen.getByRole('button', {name:'Show additional details'}).getAttribute('aria-expanded')).toBe('false');
});

test('unmapped edges expose raw evidence safely, and missing evidence-properties supports old flat data', () => {
  const raw = { id: 'scientific-id', source: 'recorded-source', supported: false, zeros: [0], markup: '<script>not executable</script>' };
  const model = edgeInfocardModel({ id: 'rendered-edge', source: 'gene', target: 'cell', type: 'new_measurement', evidence_properties: raw });
  expect(model.rawProperties).toEqual(raw);
  const { container } = render(<InfocardMenu hoveredData={{ ...model.data, evidence_properties: raw }} />);
  expect(document.querySelector('[data-field="id"]').textContent).toContain('scientific-id');
  expect(document.querySelector('[data-field="source"]').textContent).toContain('recorded-source');
  expect(container.querySelector('script')).toBeNull();
  const old = edgeInfocardModel({ id: 'legacy', source: 'gene', target: 'cell', type: 'relationship', score: 0, provenance: { version: 1 } });
  expect(old.rawProperties).toEqual({ score: 0, provenance: { version: 1 } });
});

test('sample popup has a descriptive title, exact ID and correctly bound recorded fields', () => {
  const { samplePresentation } = require('./samplePresentation');
  const sample = {'~id':'fixture_123','~labels':['Sample_node'],'~properties':{id:'fixture_123',data_modality:'Perifusion',anatomical_structure:'Islet',data_source:'Metadata',data_version:'release_fixture'}};
  render(<InfocardMenu hoveredData={{id:sample['~id'],type:'Sample node',...samplePresentation(sample,{nodes:[sample],edges:[]})}} />);
  expect(screen.getByText('Perifusion · Islet')).toBeTruthy();
  expect(screen.getByText('Sample ID').parentElement.textContent).toContain('fixture_123');
  expect(screen.getByText('Assay (recorded)').parentElement.textContent).toContain('Perifusion');
  expect(screen.getByText('Tissue / cell fraction').parentElement.textContent).toContain('Islet');
  expect(screen.queryByText('No Data')).toBeNull();
});
