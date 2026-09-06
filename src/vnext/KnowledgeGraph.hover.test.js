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

test('edge popup includes every original scientific/provenance value, retaining raw precision, zero, false and nested values', () => {
  render(<InfocardMenu hoveredData={edge} />);
  expect(screen.getByText('7.623')).toBeTruthy();
  expect(screen.getByText('10.521')).toBeTruthy();
  expect(screen.getByText('Graph evidence properties')).toBeTruthy();
  Object.entries(props).forEach(([key, value]) => {
    const row = screen.getByText(key).parentElement;
    expect(row.textContent).toContain(typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value));
  });
  expect(screen.getByText('log2_fold_change').parentElement.textContent).toContain('7.62294179320318');
  expect(screen.getByText('data_source').parentElement.textContent).toContain(props.data_source);
  expect(screen.getByText('flagged').parentElement.textContent).toContain('false');
  expect(screen.getByText('rank_in_cell_type').parentElement.textContent).toContain('0');
  expect(screen.queryByText('evidence_properties')).toBeNull();
});

test('unmapped edges expose raw evidence safely, and missing evidence-properties supports old flat data', () => {
  const raw = { id: 'scientific-id', source: 'recorded-source', supported: false, zeros: [0], markup: '<script>not executable</script>' };
  const model = edgeInfocardModel({ id: 'rendered-edge', source: 'gene', target: 'cell', type: 'new_measurement', evidence_properties: raw });
  expect(model.rawProperties).toEqual(raw);
  const { container } = render(<InfocardMenu hoveredData={{ ...model.data, evidence_properties: raw }} />);
  expect(screen.getByText('id').parentElement.textContent).toContain('scientific-id');
  expect(screen.getByText('source').parentElement.textContent).toContain('recorded-source');
  expect(container.querySelector('script')).toBeNull();
  const old = edgeInfocardModel({ id: 'legacy', source: 'gene', target: 'cell', type: 'relationship', score: 0, provenance: { version: 1 } });
  expect(old.rawProperties).toEqual({ score: 0, provenance: { version: 1 } });
});
