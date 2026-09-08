import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { InfocardMenu } from '../components/KnowledgeGraph';
import { recordedInfocardModel, fieldText, recordedText, displayNumber, HIDDEN_PROCESSING_FIELDS } from './recordedPresentation';
import { graphElements } from './graphBindings';
import catalog from '../schema/recorded_fields.json';

test('every inventoried field is visible with a readable caption and preserves its exact value', () => {
  const raw = Object.fromEntries(Object.keys(catalog.fields).map(key => [key, 'recorded_' + key]));
  const model = recordedInfocardModel({element_kind:'node',id:'renderer',evidence_properties:raw},false);
  const {container} = render(<InfocardMenu hoveredData={{element_kind:'node',id:'renderer',evidence_properties:raw}} />);
  Object.entries(raw).forEach(([key,value]) => {
    if (HIDDEN_PROCESSING_FIELDS.has(key)) { expect(container.querySelector(`[data-field="${key}"]`)).toBeNull(); return; }
    if (key !== 'description') expect(container.querySelector(`[data-field="${key}"]`).getAttribute('title')).toContain(value);
    expect(catalog.fields[key].label).not.toContain('_');
    if (key !== 'description') expect(container.querySelector(`[data-field="${key}"]`)).toBeTruthy();
  });
  expect(model.rawProperties).toEqual(raw);
});

test.each(catalog.node_types)('node label %s has a card including its description without a schema-specific mapping', label => {
  const raw = {id:'id_123',name:'Human readable full name',description:'Recorded description',synonyms:['Alias A','Alias B']};
  const node = graphElements({nodes:[{'~id':'render-id','~labels':[label],'~properties':raw}],edges:[]}).nodes[0];
  expect(node.data.evidence_properties).toEqual(raw);
  const model = recordedInfocardModel(node.data,false);
  expect(model.schema.find(([name]) => name==='Description')).toBeTruthy();
  expect(model.data.__card_title).toBe(label==='provenance'?'Metadata definition record':label==='Sample_node'?'Sample':raw.name);
});

test.each(catalog.edge_types)('relationship %s retains exact scientific fields and readable title', type => {
  const raw={id:'recorded_id',source:'recorded_source',type:'recorded_type',pvalue:4.22546526875228e-199,zero:0,flag:false};
  const data={id:'e',element_kind:'edge',source:'a',target:'b',raw_type:type,evidence_properties:raw};
  const model=recordedInfocardModel(data,true);
  expect(model.data.__card_title).not.toContain('_');
  expect(model.rawProperties).toEqual(raw);
  expect(model.data.source).toBe('a');
});

test('formatting preserves missing/zero/false/list distinctions and GO context', () => {
  expect(recordedText(null)).toBe('Not recorded'); expect(recordedText(0)).toBe('0');
  expect(recordedText(false)).toBe('No (false)'); expect(recordedText([])).toBe('Empty list (recorded)');
  expect(recordedText(['GO_1','GO_2'])).toBe('GO_1; GO_2');
  expect(fieldText('go_evidence_code','IBA')).toContain('Inferred from Biological aspect of Ancestor');
  expect(fieldText('condition','ND')).toBe('Non-diabetic (ND)'); // GO ND must never rewrite a clinical condition.
});

test('node fields named source/target cannot turn a node into a relationship card', () => {
  const {container}=render(<InfocardMenu hoveredData={{element_kind:'node',id:'n',source:'x',target:'y',evidence_properties:{id:'n',name:'Disease',description:'Current description'}}} />);
  expect(container.textContent).toContain('Current description');
  expect(container.textContent).not.toContain('Relationship');
});


test('scientific notation retains nonzero significance and exact count fields', () => {
  expect(displayNumber(2.700706e-195)).toBe('2.7 × 10⁻¹⁹⁵');
  expect(displayNumber(-4.225e-199)).toBe('-4.23 × 10⁻¹⁹⁹');
  expect(displayNumber(Number.MIN_VALUE)).not.toBe('0');
  expect(displayNumber(0)).toBe('0');
  expect(displayNumber(0.99999999)).toBe('0.99999999');
  expect(displayNumber(33686, 'total_cells')).toBe('33686');
  expect(displayNumber(1325.0798826038)).toBe('1325');
  expect(fieldText('comparison','one_vs_rest')).toBe('This cell type versus all other cell types');
  expect(fieldText('data_version','4_29_25')).toBe('29 Apr 2025');
  expect(fieldText('end_id','CL_0002079_MUC5B')).toBe('CL 0002079 MUC5B');
});

test('secondary evidence is collapsed, expands using the existing control and resets for another record', () => {
  const data={id:'edge1',element_kind:'edge',source:'g',target:'c',raw_type:'GENE_ENRICHED_IN',
    evidence_properties:{log2_fold_change:7.623,base_mean:1325.0798826038,gene_mapping_source:'nonDup_proteinCoding_IIDP_merged.features.csv'}};
  const {container,rerender}=render(<InfocardMenu hoveredData={data}/>);
  expect(container.querySelector('[data-field="base_mean"]').closest('.MuiCollapse-root').className).toContain('MuiCollapse-hidden');
  fireEvent.click(screen.getByRole('button',{name:'Show additional details'}));
  expect(screen.getByRole('button',{name:'Hide additional details'}).getAttribute('aria-expanded')).toBe('true');
  expect(container.querySelector('[data-field="gene_mapping_source"]').textContent).toContain('Gene identifier mapping file (CSV)');
  expect(container.querySelector('[data-field="gene_mapping_source"]').title).toContain(data.evidence_properties.gene_mapping_source);
  rerender(<InfocardMenu hoveredData={{...data,id:'edge2'}}/>);
  expect(screen.getByRole('button',{name:'Show additional details'}).getAttribute('aria-expanded')).toBe('false');
});
