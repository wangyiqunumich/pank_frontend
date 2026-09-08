import React from 'react';
import { render } from '@testing-library/react';
import { InfocardMenu } from '../components/KnowledgeGraph';
import { recordedInfocardModel, fieldText, recordedText } from './recordedPresentation';
import { graphElements } from './graphBindings';
import catalog from '../schema/recorded_fields.json';

test('every inventoried field is visible with a readable caption and preserves its exact value', () => {
  const raw = Object.fromEntries(Object.keys(catalog.fields).map(key => [key, 'recorded_' + key]));
  const model = recordedInfocardModel({element_kind:'node',id:'renderer',evidence_properties:raw},false);
  const {container} = render(<InfocardMenu hoveredData={{element_kind:'node',id:'renderer',evidence_properties:raw}} />);
  Object.entries(raw).forEach(([key,value]) => {
    expect(container.textContent).toContain(value);
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
  expect(fieldText('condition','ND')).toBe('ND'); // GO ND must never rewrite a clinical condition.
});

test('node fields named source/target cannot turn a node into a relationship card', () => {
  const {container}=render(<InfocardMenu hoveredData={{element_kind:'node',id:'n',source:'x',target:'y',evidence_properties:{id:'n',name:'Disease',description:'Current description'}}} />);
  expect(container.textContent).toContain('Current description');
  expect(container.textContent).not.toContain('Relationship');
});
