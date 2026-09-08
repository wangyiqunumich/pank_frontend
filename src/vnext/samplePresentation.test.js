import { samplePresentation } from './samplePresentation';
import { graphElements } from './graphBindings';
import schema from '../schema/graph_viewer_schema.json';
const sample = {'~id':'123', '~labels':['Sample_node'],display_type:'Sample node', '~properties':{id:'123',data_modality:'BCR-seq',anatomical_structure:'B cell, Spleen',note:'Replicate-1, Technical-1'}};
test('recorded assay and tissue drive the title while exact IDs stay intact', () => {
  const graph={nodes:[sample,{'~id':'HPAP-fixture','~labels':['donor'],'~properties':{id:'HPAP-fixture'}}],edges:[{'~id':'e','~type':'HAS_SAMPLE','~start':'HPAP-fixture','~end':'123'}]};
  const before=JSON.stringify(graph); const presentation=samplePresentation(sample,graph);
  expect(presentation.sample_display_label).toBe('BCR-seq · B cell, Spleen · #123');
  expect(presentation.sample_donors).toBe('HPAP-fixture');
  expect(presentation.sample_note).toBe('Replicate-1, Technical-1');
  const node=graphElements(graph,{}, {},{graphInfocard:schema}).nodes[0];
  expect(node.data.id).toBe('123');expect(node.data.label).toBe(presentation.sample_display_label);
  expect(JSON.stringify(graph)).toBe(before);
  expect(schema.nodes['Sample node'].info_panel[0]).toEqual(['Title','sample_title']);
});
test('missing notes or linked donors are explicit without inventing assay capabilities', () => {
  const node={...sample,'~properties':{id:'123',data_modality:'Perifusion',anatomical_structure:'Islet'}};
  const p=samplePresentation(node,{nodes:[node],edges:[]});
  expect(p.sample_title).toBe('Perifusion · Islet');expect(p.sample_note).toBe('Not recorded');
  expect(p.sample_donors).toBe('Not included in this graph');
  expect(samplePresentation({'~id':'g','~labels':['Gene']},{})).toEqual({});
});
test('legacy assay fields work and unrelated sample links never assign a donor', () => {
 const node={...sample,'~properties':{'Data Modality':'snMultiomics'}};
 const p=samplePresentation(node,{nodes:[node,{'~id':'t','~labels':['anatomical_structure']}],edges:[{'~type':'HAS_SAMPLE','~start':'t','~end':'123'}]});
 expect(p.sample_title).toBe('snMultiomics');expect(p.sample_tissue).toBe('Not recorded');
 expect(p.sample_record_id).toBe('123');expect(p.sample_donors).toBe('Not included in this graph');
});
